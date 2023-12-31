#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ReactAppStack } from './react-app-stack';
import { getResourceName } from './utils';
import { CertificateStack } from './certificate-stack';
import * as dotenv from 'dotenv';

dotenv.config();
const appName = 'annalytics-website';
const stage = 'dev' || process.env.DEPLOYMENT_STAGE!!;
const domain = process.env.DOMAIN!!;
const websiteDomain = process.env.WEBSITE_DOMAIN!!;
const awsAccount = process.env.AWS_ACCOUNT!!;
const primaryRegion = 'us-east-1' // cloudfront certificate have to be in us-east-1...!?!?

const app = new cdk.App();

// These two stacks are separated out here so you 'can' deploy them a different regions if you want to but at the moment there is no need
const certStack = new CertificateStack(app,  getResourceName(appName, stage, 'cert-stack'), {
  env: { account: awsAccount, region: primaryRegion },
  crossRegionReferences: true,
  appName,
  stage,
  domain,
  websiteDomain,
})

new ReactAppStack(app, getResourceName(appName, stage, 'stack'), {
  env: { account: awsAccount, region: primaryRegion },
  crossRegionReferences: true,
  appName,
  stage,
  domain,
  websiteDomain,
  zone: certStack.zone,
  certificate: certStack.certificate,
});
