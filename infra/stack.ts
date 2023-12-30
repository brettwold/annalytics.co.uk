#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ReactAppStack } from './react-app-stack';
import { getResourceName } from './utils';
import { CertificateStack } from './certificate-stack';

const appName = 'annalytics-website';
const stage = 'dev';
const domain = 'annalytics.co.uk';
const ecoDevAccount = '063191902099';
const primaryRegion = 'us-east-1' // cloudfront certificate have to be in us-east-1...!?!?

const app = new cdk.App();

// These two stacks are separated out here so you 'can' deploy them a different regions if you want to but at the moment there is no need
const certStack = new CertificateStack(app,  getResourceName(appName, stage, 'cert-stack'), {
  env: { account: ecoDevAccount, region: primaryRegion },
  crossRegionReferences: true,
  appName,
  stage,
  domain,
})

new ReactAppStack(app, getResourceName(appName, stage, 'stack'), {
  env: { account: ecoDevAccount, region: primaryRegion },
  crossRegionReferences: true,
  appName,
  stage,
  domain,
  zone: certStack.zone,
  certificate: certStack.certificate,
});
