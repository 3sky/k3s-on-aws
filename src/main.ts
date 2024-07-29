import { App, Tags } from 'aws-cdk-lib';
import { k3sStack } from './k3s';

const devEnv = {
  account: '471112990549',
  region: 'eu-central-1',
};

const app = new App();

new k3sStack(app, 'dev-k3s',
  {
    env: devEnv,
    stackName: 'dev-k8s',
  },

);
Tags.of(app).add('description', 'Testing k3s cluster');
app.synth();
