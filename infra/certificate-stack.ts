
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';

export interface CertificateStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly stage: string;
  readonly domain: string;
}

export class CertificateStack extends cdk.Stack {

  public readonly zone: IHostedZone;
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    this.zone = route53.HostedZone.fromLookup(this, 'domain-zone', {domainName: props.domain});

    const domainName = `${props.appName}-${props.stage}.${props.domain}`;
    this.certificate = new acm.Certificate(this, `certificate`, {
      domainName,
      validation: acm.CertificateValidation.fromDns(this.zone),
    });
  }
}