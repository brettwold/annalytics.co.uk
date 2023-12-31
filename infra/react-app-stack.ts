import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteService } from './website-service';
import { getResourceName } from './utils';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export interface ReactAppStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly stage: string;
  readonly domain: string;
  readonly websiteDomain: string;
  readonly zone: IHostedZone;
  readonly certificate: acm.Certificate;
}

const path = './app/out';

export class ReactAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ReactAppStackProps) {
    super(scope, id, props);

    const service = new WebsiteService(this, getResourceName(props.appName, props.stage, 'deployment'), {
      ...props,
      subdomain: 'www',
    });

    // deploy app files to s3 bucket
    new BucketDeployment(this, getResourceName(props.appName, props.stage, 'bucket-deployment'), {
      sources: [Source.asset(path)],
      destinationBucket: service.hostingBucket,
    });
  }
}
