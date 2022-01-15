import * as civo from "@pulumi/civo";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as k8sOperator from "./pulumi-k8s-operator";
import * as k8sAppLayerStack from "./pulumi-k8s-stack";

const env = pulumi.getStack();

const firewall = new civo.Firewall(`k3s-firewall-${env}`, {});

const firewallRuleApiServer = new civo.FirewallRule(`k3s-firewall-kubernetes-api-server-${env}`, {
    firewallId: firewall.id,
    protocol: "tcp",
    startPort: "6443",
    endPort: "6443",
    cidrs: ["0.0.0.0/0"],
    direction: "ingress",
    label: "kubernetes-api-server",
});

const firewallRuleHttp = new civo.FirewallRule(`k3s-firewall-kubernetes-http-${env}`, {
    firewallId: firewall.id,
    protocol: "tcp",
    startPort: "80",
    endPort: "80",
    cidrs: ["0.0.0.0/0"],
    direction: "ingress",
    label: "http",
});

const cluster = new civo.KubernetesCluster(`k3s-cluster-${env}`, {
    name: `k3s-cluster-${env}`,
    numTargetNodes: 2,
    targetNodesSize: 'g3.k3s.small',
    firewallId: firewall.id
});

export const kubeConfig = cluster.kubeconfig;

const k8sProvider = new k8s.Provider(`k8s-provider-${env}`, {
    kubeconfig: cluster.kubeconfig
});

const pulumiK8sOperator = new k8sOperator.PulumiK8sOperator('pulumi-k8s-operator', {
    provider: k8sProvider
});

const pulumiK8sStack = new k8sAppLayerStack.PulumiK8sStack('app-layer-stack', {
    provider: k8sProvider,
    dependsOn: [ pulumiK8sOperator ]
});