import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebsiteService } from './website-service';
import { getResourceName } from './utils';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface ReactAppStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly stage: string;
  readonly domain: string;

  readonly zone: IHostedZone;
  readonly certificate: acm.Certificate;
}

export class ReactAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ReactAppStackProps) {
    super(scope, id, props);

    new WebsiteService(this, getResourceName(props.appName, props.stage, 'deployment'), props);
  }
}
