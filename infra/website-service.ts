import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { CachePolicy, Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { getResourceName } from './utils';
import { ReactAppStackProps } from './react-app-stack';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';

const path = './app/out';

export class WebsiteService extends Construct {
  constructor(scope: Construct, id: string, props: ReactAppStackProps) {
    super(scope, id);

    const fqdn = `${props.websiteDomain}`;

    const hostingBucket = new Bucket(this, getResourceName(props.appName, props.stage, 'webapp'), {
      bucketName: getResourceName(props.appName, props.stage, 'webapp'),
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const distribution = new Distribution(this, getResourceName(props.appName, props.stage, 'cloudfront-dist'), {
      certificate: props.certificate,
      domainNames: [`${props.websiteDomain}`],
      defaultBehavior: {
        origin: new S3Origin(hostingBucket),
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

    new BucketDeployment(this, getResourceName(props.appName, props.stage, 'bucket-deployment'), {
      sources: [Source.asset(path)],
      destinationBucket: hostingBucket,
    });

    this.setupRoute53Records(props.domain, props.zone, distribution, props);

    new CfnOutput(this, 'WebsiteCloudFrontURL', {
      value: distribution.domainName,
      description: 'The distribution URL',
      exportName: 'WebsiteCloudFrontURL',
    });

    new CfnOutput(this, 'WebsiteBucketName', {
      value: hostingBucket.bucketName,
      description: 'The name of the S3 bucket',
      exportName: 'WebsiteBucketName',
    });
  }

  private setupRoute53Records(domainName: string, zone: IHostedZone, distribution: Distribution, deploymentContext: ReactAppStackProps) {
    const subZone = route53.HostedZone.fromHostedZoneAttributes(this, getResourceName(deploymentContext.appName, deploymentContext.stage, 'zone'), {
      zoneName: domainName,
      hostedZoneId: zone.hostedZoneId,
    });
    new route53.ARecord(this, "aRecord", {
      zone: subZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: 'www',
    });

    new route53.AaaaRecord(this, "aliasRecord", {
      zone: subZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: 'www',
    });
  }
}
