
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';


export class k3sStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.192.0.0/20'),
      maxAzs: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const baseSecurityGroup = new ec2.SecurityGroup(this, 'baseSecurityGroup', {
      vpc: vpc,
      description: 'General SG for my cluster',
      allowAllOutbound: true,
    });
    baseSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic from anywhere');
    baseSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock.toString()), ec2.Port.tcp(6443), 'Allow traffic to master APsh');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('79.184.234.2/32'), ec2.Port.tcp(22), 'Allow SSH traffic from Tailscale Network');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('79.184.234.2/32'), ec2.Port.tcp(6443), 'Allow kubectl traffic from Tailscale Network');

    const awsKeyPair = new ec2.CfnKeyPair(this, 'localkeypair', {
      publicKeyMaterial:
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJxYZEBNRLXmuign6ZgNbmaSK7cnQAgFpx8cCscoqVed local',
      keyName: 'localawesomekey',
    });

    const myKeyPair = ec2.KeyPair.fromKeyPairAttributes(this, 'mykey', {
      keyPairName: awsKeyPair.keyName,
    });
    const defaultInstanceProps = {
      vpc: vpc,
      machineImage: ec2.MachineImage.genericLinux({
        // CentOS 9 Stream on x86
        'eu-central-1': 'ami-0022e2e80fa74c5d7',
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL,
      ),
    };

    for (let i = 0; i < 2; i++) {
      const instance = new ec2.Instance(this, 'node-' + i, {
        instanceName: 'agent-node-' + i,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        securityGroup: baseSecurityGroup,
        keyPair: myKeyPair,
        ...defaultInstanceProps,

      });
      Tags.of(instance).add('role', 'agent');
    }

    const instance = new ec2.Instance(this, 'server-node', {
      instanceName: 'server-node',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: baseSecurityGroup,
      keyPair: myKeyPair,
      ...defaultInstanceProps,

    });
    Tags.of(instance).add('role', 'server');
  }
}
