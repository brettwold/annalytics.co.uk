---
title: "Deploy a serverless Next.js website with AWS CDK - utilising S3 and Cloudfront"
meta_title: ""
description: "Deploy a serverless Next.js website statically to AWS using S3 and Cloudfront"
date: 2023-12-31T00:00:00Z
image: "/images/cloudfront-static-website.png"
categories: ["IaC"]
author: "Brett Cherrington"
tags: ["aws", "cdk", "s3", "cloudfront", "route53", "nextjs", "typescript"]
draft: false
---

This post is going to show you how the site you are looking at is deployed to AWS. It is essentially a single page static website but it is built using Next.js to enable easy regular updating. Using an S3 bucket in conjunction with Cloudfront provides an incredibly stable and scalable website really quickly, for little or no cost. The CDK code discussed in this post show you how quickly and easily this site can be deployed to AWS in a repeatable and adaptable way. Here I am using Next.js to build and export a static website so there is no serverside element. This does mean that to update the content you need to re-build and upload new assets, but this is a small price to pay for the simplicity and low-cost of this solution. In reality this is a low content changing site; I won't be updating it all the time, only when I create a new blog will the content be likely to change. You could easily add the ability for this site to be exported and deployed/updated as a GitHub action each time there is a new push to main (maybe I'll add this at some point :) ). Ask yourself - "How often do you really update that website?". If the answer is not very often then this solution may be ideal for you. This does also mean that the serverside Next.js dynamic route features cannot be used.

In this post I am only going to cover the CDK implementation part but the full list of steps starting from nothing would be:

1) Create AWS account
2) Setup deployment user/role with least-privilege access and decide how your deployment user will access AWS e.g. Access Credentials, SSO, OIDC etc. 
3) Setup hosted zone using either a new domain created within AWS or by adjusting the nameserver settings of your existing domain so that Route53 is responsible for nameserving your domain
4) Ensure that AWS SCM can create subdomain certificates for your domain
5) Bootstrap CDK for your account and region(s)
6) Develop and test website locally
7) Build (export) Next.js static website
8) Test static website locally
9) Deploy application using CDK
10) Test deployed website 

You can view the [full source of the application including the IaC deployment code here](https://github.com/brettwold/annalytics.co.uk). The Next.js implementation itself is a slightly modified version of the "Nextjs + Tailwind CSS + TypeScript Starter and Boilerplate" from zeon-studio which [can be found here](https://github.com/zeon-studio/nextplate).

## Application Design

The application itself, shown in the diagram above, consists of an S3 bucket to contain all the website assets, a Cloudfront distribution which exposes the website to the world, an SSL certificate setup and managed by AWS Certificate Manager (ACM) and the Route53 records required to connect it all to a domain.

Website users will obtain the resources from cloudfront which in turn is acting as a proxy to obtain and then cache the objects from S3. This is a very cost-effective way of hosting a website as it usually falls almost entirely within the AWS free tier assuming you haven't already used this up in your account.

Essentially the browser will perform the job of looking up your domain via the route53 (A record) which will respond with the cloudfront distribution domain name which will then be used to get the resources.

### AWS CDK Implementation

The application is setup as two CDK stacks. This is so that the bucket could in theory be deployed to a different region if you wanted to but as per the note below you can probably just create your s3 bucket also in the `us-east-1` region.

> In order to associate AWS SSL certificates with a CloudFront distribution they must be created in the `us-east-1` region. The bucket that is created to hold the website assets could exist in any region, however, as Cloudfront is a global CDN it makes sense to also host the S3 bucket in `us-east-1` as the assets will be distributed around the world and cached in the relevant edge regions by Cloudfront itself when they are accessed.

#### Certificate Stack

This stack simply creates a new subdomain certificate for your domain. Usually this would be for the `www` subdomain. The code below assumes there is an existing hosted zone in Route53 for you primary domain name.

```typescript
export class CertificateStack extends cdk.Stack {

  public readonly zone: IHostedZone;
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    this.zone = route53.HostedZone.fromLookup(this, 'domain-zone', {domainName: props.domain});

    const domainName = `${props.websiteDomain}`;
    this.certificate = new acm.Certificate(this, `certificate`, {
      domainName,
      validation: acm.CertificateValidation.fromDns(this.zone),
    });
  }
}
```

#### Website Stack

This stack creates the S3 bucket, Cloudfront Distribution and the A records in route53.

First of all the bucket is created. As you can see it is a private bucket as only Cloudfront needs to be able to access it. 

```typescript
this.hostingBucket = new Bucket(this, getResourceName(props.appName, props.stage, 'webapp'), {
  bucketName: getResourceName(props.appName, props.stage, 'webapp'),
  autoDeleteObjects: true,
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  removalPolicy: RemovalPolicy.DESTROY,
});
```

Next the Cloudfront distribution is setup which takes a reference to the certificate created in the other stack and the bucket created above. 

In the example below the caching is disabled, this is useful when you are setting up your website. However, once your site is stable you should change this value to a different option to allow Cloudfront to cache your website resources as required. Also notice the `errorResponses` section which is setup to redirect everything back to index.html with a 200 status code, this is required as the application is a React/Next.js single page application where everything is essentially served by a single index.html page.

```typescript
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
```

Next we create two A records that tell Route53 that the subdomain should be routed to the Cloudfront distribution. The A record is for IPv4 and the AAAA record is for IPv6. Technically you can omit the IPv6 record but I've left it here for completeness.

```typescript
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
```

The bucket created above also need to be loaded with the website resources. This can be done either by use of some more CDK code as shown below or manually performs via AWS console or even via the CLI using AWS SDK commands.

The CDK code below uses the `BucketDeployment` class to upload all the built Next.js output to the bucket. The Next.js application must be built using `npm run build` so that the static assets are created.

```typescript
// deploy app files to s3 bucket
new BucketDeployment(this, getResourceName(props.appName, props.stage, 'bucket-deployment'), {
  sources: [Source.asset(path)],
  destinationBucket: service.hostingBucket,
});
```

> In the source repo for this project you will see this code as it then makes a complete build and deployment of the website together in one place as per AWS well-architected guidelines for CDK applications.

These two stacks can then be combined as a single CDK `App` like so.

```typescript
const app = new cdk.App();

const certStack = new CertificateStack(app,  getResourceName(appName, stage, 'cert-stack'), {
  env: { account: awsAccount, region: primaryRegion },
  crossRegionReferences: true,
  appName,
  stage,
  domain,
  websiteDomain,
});

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
```

----

Once again for access to the [full code for this post see here](https://github.com/brettwold/annalytics.co.uk) feel free to download, edit and use it for your own website if you want. 
