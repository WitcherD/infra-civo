import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";

export class PulumiK8sOperator extends pulumi.ComponentResource {
    constructor(name: string,  opts?: pulumi.ComponentResourceOptions) {
        super('pulumi-k8s-operator', name, {}, opts);

        const crds = new kubernetes.yaml.ConfigFile("crds", { file: "https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/v1.3.0/deploy/crds/pulumi.com_stacks.yaml"},
            { provider: opts?.provider });

        const operatorServiceAccount = new kubernetes.core.v1.ServiceAccount("operator-service-account", {}, { provider: opts?.provider });
        const operatorRole = new kubernetes.rbac.v1.ClusterRole("operator-role", {
            rules: [
                {
                    apiGroups: [""],
                    resources: [
                        "pods",
                        "services",
                        "services/finalizers",
                        "endpoints",
                        "persistentvolumeclaims",
                        "events",
                        "configmaps",
                        "secrets"
                    ],
                    verbs: [
                        "create",
                        "delete",
                        "get",
                        "list",
                        "patch",
                        "update",
                        "watch",
                    ],
                },
                {
                    apiGroups: ["apps"],
                    resources: [
                        "deployments",
                        "daemonsets",
                        "replicasets",
                        "statefulsets",
                    ],
                    verbs: [
                        "create",
                        "delete",
                        "get",
                        "list",
                        "patch",
                        "update",
                        "watch",
                    ],
                },
                {
                    apiGroups: ["traefik.containo.us"],
                    resources: [
                        "ingressroutes"
                    ],
                    verbs: [
                        "create",
                        "delete",
                        "get",
                        "list",
                        "patch",
                        "update",
                        "watch",
                    ],
                },
                {
                    apiGroups: ["networking.k8s.io"],
                    resources: [
                        "ingresses"
                    ],
                    verbs: [
                        "create",
                        "delete",
                        "get",
                        "list",
                        "patch",
                        "update",
                        "watch",
                    ],
                },
                {
                    apiGroups: ["monitoring.coreos.com"],
                    resources: ["servicemonitors"],
                    verbs: [
                        "create",
                        "get",
                    ],
                },
                {
                    apiGroups: ["apps"],
                    resourceNames: ["pulumi-kubernetes-operator"],
                    resources: ["deployments/finalizers"],
                    verbs: ["update"],
                },
                {
                    apiGroups: [""],
                    resources: ["pods"],
                    verbs: ["get"],
                },
                {
                    apiGroups: ["apps"],
                    resources: [
                        "replicasets",
                        "deployments",
                    ],
                    verbs: ["get"],
                },
                {
                    apiGroups: ["pulumi.com"],
                    resources: ["*"],
                    verbs: [
                        "create",
                        "delete",
                        "get",
                        "list",
                        "patch",
                        "update",
                        "watch",
                    ],
                },
                {
                    apiGroups: ["coordination.k8s.io"],
                    resources: ["leases"],
                    verbs: [
                        "create",
                        "get",
                        "list",
                        "update",
                    ],
                },
            ],
        }, { provider: opts?.provider });

        const operatorRoleBinding = new kubernetes.rbac.v1.ClusterRoleBinding("operator-role-binding", {
            subjects: [{
                kind: "ServiceAccount",
                name: operatorServiceAccount.metadata.name,
                namespace: 'default'
            }],
            roleRef: {
                kind: "ClusterRole",
                name: operatorRole.metadata.name,
                apiGroup: "rbac.authorization.k8s.io",
            },
        }, { provider: opts?.provider });

        const operatorDeployment = new kubernetes.apps.v1.Deployment("pulumi-kubernetes-operator", {
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        name: "pulumi-kubernetes-operator",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            name: "pulumi-kubernetes-operator",
                        },
                    },
                    spec: {
                        serviceAccountName: operatorServiceAccount.metadata.name,
                        containers: [{
                            name: "pulumi-kubernetes-operator",
                            image: "pulumi/pulumi-kubernetes-operator:v1.3.0",
                            args: ["--zap-level=error", "--zap-time-encoding=iso8601"],
                            imagePullPolicy: "Always",
                            env: [
                                {
                                    name: "WATCH_NAMESPACE",
                                    valueFrom: {
                                        fieldRef: {
                                            fieldPath: "metadata.namespace",
                                        },
                                    },
                                },
                                {
                                    name: "POD_NAME",
                                    valueFrom: {
                                        fieldRef: {
                                            fieldPath: "metadata.name",
                                        },
                                    },
                                },
                                {
                                    name: "OPERATOR_NAME",
                                    value: "pulumi-kubernetes-operator",
                                },
                                {
                                    name: "GRACEFUL_SHUTDOWN_TIMEOUT_DURATION",
                                    value: "5m",
                                },
                                {
                                    name: "MAX_CONCURRENT_RECONCILES",
                                    value: "10",
                                },


                            ],
                        }],
                        // Should be same or larger than GRACEFUL_SHUTDOWN_TIMEOUT_DURATION
                        terminationGracePeriodSeconds: 300,
                    },
                },
            },
        }, { dependsOn: crds, provider: opts?.provider });
    }
}
