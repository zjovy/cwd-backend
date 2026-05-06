import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOrg = this.node.tryGetContext('githubOrg');
    const githubRepo = this.node.tryGetContext('githubRepo');

    // GitHub OIDC Provider (one per AWS account)
    const githubProvider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // IAM Role that GitHub Actions assumes
    const deployRole = new iam.Role(this, 'GithubActionsDeployRole', {
      roleName: 'github-actions-cwd-deploy',
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:ref:refs/heads/main`,
          },
        },
      ),
    });

    // Minimal permissions: only what GitHub Actions needs for SSH deploy
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:cwd/*`,
        ],
      }),
    );

    new cdk.CfnOutput(this, 'GithubActionsRoleArn', {
      value: deployRole.roleArn,
      description: 'Add this as AWS_OIDC_ROLE_ARN GitHub secret',
    });
  }
}
