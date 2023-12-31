import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { CachePolicy, Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { getResourceName } from './utils';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface WebsiteServiceProps extends cdk.StackProps {
  readonly appName: string;
  readonly stage: string;
  readonly domain: string;
  readonly websiteDomain: string;
  readonly zone: IHostedZone;
  readonly certificate: acm.Certificate;
  readonly subdomain: string;
}

export class WebsiteService extends Construct {

  readonly hostingBucket: Bucket;

  constructor(scope: Construct, id: string, props: WebsiteServiceProps) {
    super(scope, id);

    this.hostingBucket = new Bucket(this, getResourceName(props.appName, props.stage, 'webapp'), {
      bucketName: getResourceName(props.appName, props.stage, 'webapp'),
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const distribution = new Distribution(this, getResourceName(props.appName, props.stage, 'cloudfront-dist'), {
      certificate: props.certificate,
      domainNames: [`${props.websiteDomain}`],
      defaultBehavior: {
        origin: new S3Origin(this.hostingBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED // possibly temporary
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        }
      ],
    });

    this.setupRoute53Records(props.domain, props.zone, distribution, props);

    new CfnOutput(this, 'WebsiteCloudFrontURL', {
      value: distribution.domainName,
      description: 'The distribution URL',
      exportName: 'WebsiteCloudFrontURL',
    });

    new CfnOutput(this, 'WebsiteBucketName', {
      value: this.hostingBucket.bucketName,
      description: 'The name of the S3 bucket',
      exportName: 'WebsiteBucketName',
    });
  }

  private setupRoute53Records(domainName: string, zone: IHostedZone, distribution: Distribution, props: WebsiteServiceProps) {
    const subZone = route53.HostedZone.fromHostedZoneAttributes(this, getResourceName(props.appName, props.stage, 'zone'), {
      zoneName: domainName,
      hostedZoneId: zone.hostedZoneId,
    });
    new route53.ARecord(this, "aRecord", {
      zone: subZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: props.subdomain,
    });

    new route53.AaaaRecord(this, "aliasRecord", {
      zone: subZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: props.subdomain,
    });
  }
}
