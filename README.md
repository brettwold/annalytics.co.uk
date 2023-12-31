# Annalytics Website

Website built using NextJs and deployed using CDK to AWS. 

NextJs website is exported to static web content and is privately hosted in an S3 bucket and exposed using CloudFront.

Updates to the website can then either be performed by re-deployment or by simply overwriting the files stored on S3.

## Install and Setup

Project is a Node.js project with Typescript therefore to install simply use `npm`

```
npm install
```

You will need to create a `.env` file that matches your environment.

```
DEPLOYMENT_STAGE=dev
DOMAIN=example.com
WEBSITE_DOMAIN=www.example.com
AWS_ACCOUNT=<YOUR AWS ACCOUNT NUMBER>
```

## Local Deployment for Development

To run the site locally use

```
npm run dev
```

This will start a watched instance on `http://localhost:3000` any updates you make will be reflected instantly.

You can also build/export the site as static assets and then preview the output. This allows you to check for broken links/images etc when the site is built.

```
npm run build
npm run preview
```

## Deployment

The website is deployed using AWS CDK. To run this locally simply run

```
npm run deploy
```

> This assumes you have already run CDK before and you have bootstrapped the CDK in your account for region `us-east-1`
> If you have not used the CDK before then you should [follow the guide here](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) to get started

The CDK code here will deploy 2 stacks:
* A certificate stack to setup and manage an SSL cert for your website domain. This assumes you already have setup a hosted zone for your primary domain and that the AWS Certificate Manager has [permission to create new subdomain certs for your domain](https://docs.aws.amazon.com/acm/latest/userguide/setup-caa.html). This certificate has to be created in the `us-east-1` region so that it is compatible with CloudFront.  
* The website stack consisting of an S3 Bucket and CloudFront distribution. The stack will also setup the Route53 A (and AAAA) records for your subdomain.

