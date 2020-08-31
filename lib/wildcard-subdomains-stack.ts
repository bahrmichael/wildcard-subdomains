import * as cdk from '@aws-cdk/core';
import { SPADeploy } from 'cdk-spa-deploy';
import { DnsValidatedCertificate, ValidationMethod } from "@aws-cdk/aws-certificatemanager";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { HostedZone, ARecord, RecordTarget } from '@aws-cdk/aws-route53';

export class WildcardSubdomainsStack extends cdk.Stack {

  private readonly domain: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.domain = "picture.bahr.dev";
    
    // Requires environment, you must specify env for the stack.
    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', { domainName: this.domain });

    // Failed to create resource. Cannot read property 'Name' of undefined -> try again?
    const certificate = new DnsValidatedCertificate(this, "Certificate", {
      hostedZone,
      domainName: this.domain,
      subjectAlternativeNames: [`*.${this.domain}`],
      validationDomains: {
        [this.domain]: this.domain,
        [`*.${this.domain}`]: this.domain
      },
      validationMethod: ValidationMethod.DNS
    });

    const pictures = new SPADeploy(this, 'picturesDeployment')
      .createSiteWithCloudfront({indexDoc: 'pictures.html', websiteFolder: './website', certificateARN: certificate.certificateArn, cfAliases: [`*.${this.domain}`]
    });

    const landingPage = new SPADeploy(this, 'landingDeployment')
      .createSiteWithCloudfront({indexDoc: 'landing.html', websiteFolder: './website', certificateARN: certificate.certificateArn, cfAliases: [this.domain]
    });

    new ARecord(this, "ARecord", {
      zone: hostedZone,
      recordName: `${this.domain}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(landingPage.distribution))
    });

    new ARecord(this, "WildCardARecord", {
      zone: hostedZone,
      recordName: `*.${this.domain}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(pictures.distribution))
    });
  }
}
