---
title: "Deploy a Next.js website to AWS utilising S3, Cloudfront and AWS CDK"
meta_title: ""
description: "Deploy a Next.js website statically to AWS using S3 and Cloudfront"
date: 2023-12-31T00:00:00Z
image: "/images/cloudfront-static-website.png"
categories: ["IaC"]
author: "Brett Cherrington"
tags: ["aws", "cdk", "s3", "cloudfront", "route53", "nextjs", "typescript"]
draft: false
---

This post is going to show you how the site you are looking at is deployed to AWS. It is essentially a single page static website but it is built using Next.js to enable easy regular updating. You can view the [full source of the application including the IaC deployment code here](https://github.com/brettwold/annalytics.co.uk). The Next.js implementation itself is a slightly modified version of the "Nextjs + Tailwind CSS + TypeScript Starter and Boilerplate" from zeon-studio which [can be found here](https://github.com/zeon-studio/nextplate).


## Application Design

The application itself, shown in the diagram above, consists of an S3 bucket to contain all the website assets, a Cloudfront distribution which exposes the website to the world, an SSL certificate setup and managed by AWS Certificate Manager (ACM) and the Route53 records required to connect it all to a domain.

Website users will obtain the resources from cloudfront which in turn is acting as a proxy to obtain and then cache the objects from S3. This is a very cost-effective way of hosting a website as it usually falls almost entirely within the AWS free tier assuming you haven't already used this up in your account.

Essentially the browser will perform the job of looking up your domain via the route53 (A record) which will respond with the cloudfront distribution domain name which will then be used to get the resources.

### AWS CDK Implementation

The application is setup as two CDK stacks. This is so that the bucket could in theory be deployed to a different region if you wanted to but as per the note below you can probably just create your s3 bucket also in the `us-east-1` region.

> In order to associate AWS SSL certificates with a CloudFront distribution they must be created in the `us-east-1` region. The bucket that is created to hold the website assets could exist in any region, however, as Cloudfront is a global CDN it makes sense to also host the S3 bucket in `us-east-1` as the assets will be distributed around the world and cached in the relevant edge regions by Cloudfront itself when they are accessed.

#### Certificate Stack

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
