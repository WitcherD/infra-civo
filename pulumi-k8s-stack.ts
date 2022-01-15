import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";

export class PulumiK8sStack extends pulumi.ComponentResource {
    constructor(name: string,  opts?: pulumi.ComponentResourceOptions) {
        super('pulumi-k8s-stack', name, {}, opts);

        const pulumiConfig = new pulumi.Config();
        const env = pulumi.getStack();

        const pulumiAccessTokenData = pulumiConfig.requireSecret("pulumiAccessToken");
        const appProjectRepo = pulumiConfig.require("appProjectRepo");
        const appPulumiProject = pulumiConfig.require("appPulumiProject");

        // const gitAppLayerStackAccessTokenData = pulumiConfig.requireSecret("gitAppLayerStackAccessToken");
        // const gitRegistryDockerConfigData = pulumiConfig.requireSecret("gitRegistryDockerConfig");

        const pulumiAccessToken = new kx.Secret("pulumi-access-token", {
            stringData: { accessToken: pulumiAccessTokenData },
        }, { provider: opts?.provider });

        // const gitAppLayerStackAccessToken = new kx.Secret("git-app-layer-stack-access-token", {
        //     stringData: { privateToken: gitAppLayerStackAccessTokenData },
        // }, { provider: opts?.provider });

        const namespace = new k8s.core.v1.Namespace(`${env}`, {
            metadata: {
                name: env
            }
        }, { provider: opts?.provider });

        // const gitRegistryDockerConfig = new k8s.core.v1.Secret("git-registry-docker-config", {
        //     type: 'kubernetes.io/dockerconfigjson',
        //     metadata: {
        //         name: 'registry-credentials',
        //         namespace: namespace.metadata.name
        //     },
        //     data: { '.dockerconfigjson': gitRegistryDockerConfigData }
        // }, { provider: opts?.provider });

        const appLayerStack = new k8s.apiextensions.CustomResource("app-layer-stack", {
            apiVersion: 'pulumi.com/v1',
            kind: 'Stack',
            spec: {
                envRefs: {
                    PULUMI_ACCESS_TOKEN: { type: 'Secret', secret : { name: pulumiAccessToken.metadata.name, key: 'accessToken' }}
                },
                // gitAuth: {
                //     accessToken: { type: 'Secret', secret : { name: gitAppLayerStackAccessToken.metadata.name, key: 'privateToken' }}
                // },
                stack: `${appPulumiProject}/${env}`,
                projectRepo: appProjectRepo,
                branch: "refs/heads/master",
                destroyOnFinalize: true,
            }
        }, { provider: opts?.provider });
    }
}
