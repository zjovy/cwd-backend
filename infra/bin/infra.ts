#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('region') || 'us-east-1',
};

const networkStack = new NetworkStack(app, 'CwdNetworkStack', { env });

const databaseStack = new DatabaseStack(app, 'CwdDatabaseStack', {
  env,
  vpc: networkStack.vpc,
});

const computeStack = new ComputeStack(app, 'CwdComputeStack', {
  env,
  vpc: networkStack.vpc,
  dbSecret: databaseStack.dbSecret,
  rdsEndpoint: databaseStack.rdsEndpoint,
});

new CicdStack(app, 'CwdCicdStack', { env });
