import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecret: secretsmanager.ISecret;
  rdsEndpoint: string;
}

export class ComputeStack extends cdk.Stack {
  public readonly instance: ec2.Instance;
  public readonly elasticIp: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { vpc, dbSecret, rdsEndpoint } = props;
    const domainName = this.node.tryGetContext('domainName');
    const sshAllowedIps: string[] = this.node.tryGetContext('sshAllowedIps') || ['0.0.0.0/0'];
    const githubOrg = this.node.tryGetContext('githubOrg');
    const githubRepo = this.node.tryGetContext('githubRepo');

    // Security group for EC2
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'Ec2SecurityGroup', {
      vpc,
      description: 'Security group for CWD backend EC2',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS from anywhere
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

    // Allow SSH from specified IPs
    for (const ip of sshAllowedIps) {
      ec2SecurityGroup.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(22), 'SSH');
    }

    // Allow EC2 to connect to RDS (rule added in database stack via VPC CIDR)

    // IAM role for EC2 (Secrets Manager access + SSM)
    const ec2Role = new iam.Role(this, 'Ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant read access to secrets
    dbSecret.grantRead(ec2Role);

    // Also grant access to firebase secret (created manually or via console)
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:cwd/firebase-key*`,
        ],
      }),
    );

    // Key pair for SSH
    const keyPair = new ec2.KeyPair(this, 'Ec2KeyPair', {
      keyPairName: 'cwd-backend-key',
    });

    // Read and prepare user data script
    let userData = readFileSync(join(__dirname, '../scripts/user-data.sh'), 'utf8');
    userData = userData.replace(/\$\{DOMAIN_NAME\}/g, domainName);
    userData = userData.replace(/\$\{GITHUB_ORG\}/g, githubOrg);
    userData = userData.replace(/\$\{GITHUB_REPO\}/g, githubRepo);
    userData = userData.replace(/\$\{FRONTEND_URL\}/g, 'https://yourapp.com'); // Update this

    // EC2 instance
    this.instance = new ec2.Instance(this, 'CwdBackend', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      keyPair,
      userData: ec2.UserData.custom(userData),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Elastic IP
    this.elasticIp = new ec2.CfnEIP(this, 'ElasticIp');
    new ec2.CfnEIPAssociation(this, 'EipAssociation', {
      allocationId: this.elasticIp.attrAllocationId,
      instanceId: this.instance.instanceId,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ElasticIpAddress', {
      value: this.elasticIp.attrPublicIp,
      description: 'Add this as an A record in Squarespace DNS for api.yourapp.com',
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
    });

    new cdk.CfnOutput(this, 'SshCommand', {
      value: `ssh -i cwd-backend-key.pem ec2-user@${this.elasticIp.attrPublicIp}`,
    });

    new cdk.CfnOutput(this, 'KeyPairId', {
      value: keyPair.keyPairId,
      description: 'Retrieve private key: aws ssm get-parameter --name /ec2/keypair/<id> --with-decryption',
    });
  }
}
