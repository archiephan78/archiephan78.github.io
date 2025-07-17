---
title: VictoriaMetrics operator on K8S 
author: archiephan
pubDatetime: 2025-07-17T08:15:41Z
modDatetime: 2025-07-17T07:41:26Z
title: "VictoriaMetrics operator on K8S"
draft: false
tags:
  - monitoring
  - victoriametric
  - K8S
description: VictoriaMetrics operator on K8S
---

# VictoriaMetrics operator on K8S

![](@/assets/images/notes/vms-k8s.drawio.png)

- In previous section i deployed VMs cluster on K8S with Helm. In this part i will using VictoriaMetrics on K8S with VMs operator

- Design and implementation inspired by prometheus-operator. It's great a tool for managing monitoring configuration of your applications. VictoriaMetrics operator has api capability with it. So you can use familiar CRD objects: ServiceMonitor, PodMonitor, PrometheusRule and Probe. Or you can use VictoriaMetrics CRDs:

  - VMServiceScrape - defines scraping metrics configuration from pods backed by services.
  - VMPodScrape - defines scraping metrics configuration from pods.
  - VMRule - defines alerting or recording rules.
  - VMProbe - defines a probing configuration for targets with blackbox exporter.

- Download CRD form github

```bash
# Get latest release version from https://github.com/VictoriaMetrics/operator/releases/latest
export VM_VERSION=`basename $(curl -fs -o/dev/null -w %{redirect_url} https://github.com/VictoriaMetrics/operator/releases/latest)`
wget https://github.com/VictoriaMetrics/operator/releases/download/$VM_VERSION/bundle_crd.zip
unzip  bundle_crd.zip
```

- Install CRD

```bash
kubectl apply -f release/crds
```

- Create namespace `monitoring-system`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-system
```

- apply operator manifest into cluster

```bash
kubectl apply -f release/operator/
```

- Check pod installed

```bash
➜ kubectl get pods -n monitoring-system
NAME                           READY   STATUS    RESTARTS   AGE
vm-operator-8464b8949c-sm98w   1/1     Running   0          9m19s
```

- Install vmcluster

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMCluster
metadata:
  name: example-vmcluster-persistent
spec:
  # Add fields here
  retentionPeriod: "4"
  replicationFactor: 1
  vmstorage:
    replicaCount: 1
    storageDataPath: "/vm-data"
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: premium-ssd
          resources:
            requests:
              storage: 10Gi
    resources:
      limits:
        cpu: "0.5"
        memory: 500Mi
  vmselect:
    replicaCount: 1
    cacheMountPath: "/select-cache"
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: premium-ssd
          resources:
            requests:
              storage: 2Gi
    resources:
      limits:
        cpu: "0.3"
        memory: "300Mi"
  vminsert:
    replicaCount: 1
EOF
```

- check pod create

```bash
➜  kubectl get pod -o wide
NAME                                                     READY   STATUS    RESTARTS   AGE     IP           NODE                                           NOMINATED NODE   READINESS GATES
vminsert-example-vmcluster-persistent-547f79f869-xmrds   1/1     Running   0          6m44s   10.200.1.3   pool-bqap2vyc-bbxkamrsu3v0r5hn-node-g8u7phor   <none>           <none>
vmselect-example-vmcluster-persistent-0                  1/1     Running   0          12m     10.200.0.8   pool-bqap2vyc-bbxkamrsu3v0r5hn-node-p2jnd4qh   <none>           <none>
vmstorage-example-vmcluster-persistent-0                 1/1     Running   0          13m     10.200.0.7   pool-bqap2vyc-bbxkamrsu3v0r5hn-node-p2jnd4qh   <none>           <none>
```

- Note: vmselect has vmui UI at URL `<URL>/select/0/prometheus/vmui/`

- Install vmagent

```bash
kubectl apply -f release/examples/vmagent_rbac.yaml
cat <<EOF | kubectl apply -f -
 apiVersion: operator.victoriametrics.com/v1beta1
 kind: VMAgent
 metadata:
   name: example-vmagent
 spec:
   selectAllByDefault: true
   replicaCount: 1
   remoteWrite:
     - url: "http://vminsert-example-vmcluster-persistent.default.svc.cluster.local:8480/insert/0/prometheus/api/v1/write"
EOF
```

- Install VMAlertmanager - represents alertmanager configuration, first, you have to create secret with a configuration for it

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlertmanager
metadata:
  name: example-alertmanager-raw-config
spec:
  # Add fields here
  replicaCount: 1
  configSecret: alertmanager-config
  configRawYaml: |
        global:
          resolve_timeout: 5m
        route:
          group_wait: 30s
          group_interval: 5m
          repeat_interval: 12h
          receiver: 'webhook'
        receivers:
        - name: 'webhook'
          webhook_configs:
          - url: 'http://localhost:30502/'
EOF
```

- Config `VMAlertmanagerConfig` allows managing `VMAlertmanager` configuration.

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlertmanagerConfig
metadata:
  name: example
  namespace: default
spec:
  route:
    routes:
      - receiver: webhook
        continue: true
    group_by: []
    continue: false
    matchers:
      - job = "alertmanager"
    group_wait: 30s
    group_interval: 45s
    repeat_interval: 1h
  mute_time_intervals:
    - name: base
      time_intervals:
        - times:
            - start_time: ""
              end_time: ""
          weekdays: []
          days_of_month: []
          months: []
          years: []
  receivers:
      webhook_configs:
        - url: http://localhost:30502/
EOF
```

- Create `vmalert` object

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlert
metadata:
  name: example-vmalert
spec:
  replicaCount: 1
  datasource:
    url: "http://vmselect-example-vmcluster-persistent.default.svc:8481/select/0/prometheus/"
  notifier:
      url: "http://vmalertmanager-example-alertmanager-raw-config.default.svc:9093"
  evaluationInterval: "30s"
  selectAllByDefault: true

EOF
```

- By default when we create ressource with VM oprerator, VMServiceScrape will auto create:

```bash
➜ kubectl get VMServiceScrape
NAME                                             AGE
vmagent-example-vmagent                          3h36m
vmalert-example-vmalert                          76m
vmalertmanager-example-alertmanager-raw-config   176m
vminsert-example-vmcluster-persistent            3h54m
vmselect-example-vmcluster-persistent            3h55m
vmstorage-example-vmcluster-persistent           3h56m
```

- scapre metric from kube-state-metrics

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMStaticScrape
metadata:
  name: kube-state-metrics-scrape
spec:
  jobName: kube-state-metrics
  targetEndpoints:
    - targets: ["kube-state-metrics.kube-system.svc.cluster.local:8080"]
EOF
```

- Checking on vmui UI for new metric scrape:

![](@/assets/images/notes/vmui.png)

- kube-cadvisor-metrics

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMNodeScrape
metadata:
  name: cadvisor-metrics
spec:
  scheme: "https"
  tlsConfig:
    insecureSkipVerify: true
    caFile: "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
  bearerTokenFile: "/var/run/secrets/kubernetes.io/serviceaccount/token"
  relabelConfigs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - targetLabel: __address__
      replacement: kubernetes.default.svc:443
    - sourceLabels: [__meta_kubernetes_node_name]
      regex: (.+)
      targetLabel: __metrics_path__
      replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
  metricRelabelConfigs:
    - action: replace
      sourceLabels: [pod]
      regex: '(.+)'
      targetLabel: pod_name
      replacement: '${1}'
    - action: replace
      sourceLabels: [container]
      regex: '(.+)'
      targetLabel: container_name
      replacement: '${1}'
    - action: replace
      targetLabel: name
      replacement: k8s_stub
    - action: replace
      sourceLabels: [id]
      regex: '^/system\.slice/(.+)\.service$'
      targetLabel: systemd_service_name
      replacement: '${1}'
EOF
```

- I create more some example rule scrape for vmagent if you dont want use kube-state-metrics, becareful with `${1}` variable in manifest, it maybe missing if you run in bash shell

- kubernetes-apiservers

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMNodeScrape
metadata:
  name: kubernetes-apiservers
spec:
  scheme: https
  tlsConfig:
    caFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecureSkipVerify: true
  bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
  relabelConfigs:
    - sourceLabels:
        [
            __meta_kubernetes_namespace,
            __meta_kubernetes_service_name,
            __meta_kubernetes_endpoint_port_name,
        ]
      action: keep
      regex: default;kubernetes;https
EOF
```

- kube-nodes \*

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMNodeScrape
metadata:
  name: kubernetes-nodes
spec:
  scheme: https
  tlsConfig:
    caFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecureSkipVerify: true
  bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
  relabelConfigs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - targetLabel: __address__
      replacement: kubernetes.default.svc:443
    - sourceLabels: [__meta_kubernetes_node_name]
      regex: (.+)
      targetLabel: __metrics_path__
      replacement: /api/v1/nodes/${1}/proxy/metrics
EOF
```

- kubernetes-service-endpoints

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMServiceScrape
metadata:
  name: kubernetes-service-endpoints
spec:
  endpoints:
    - port: https
      relabelConfigs:
        - action: drop
          sourceLabels: [__meta_kubernetes_pod_container_init]
        - action: keep_if_equal
          sourceLabels: [__meta_kubernetes_pod_annotation_prometheus_io_port, __meta_kubernetes_pod_container_port_number]
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_scrape]
          action: keep
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_scheme]
          action: replace
          targetLabel: __scheme__
          regex: (https?)
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          targetLabel: __metrics_path__
          regex: (.+)
        - sourceLabels:
            [
              __address__,
              __meta_kubernetes_service_annotation_prometheus_io_port,
            ]
          action: replace
          targetLabel: __address__
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - sourceLabels: [__meta_kubernetes_namespace]
          action: replace
          targetLabel: kubernetes_namespace
        - sourceLabels: [__meta_kubernetes_service_name]
          action: replace
          targetLabel: kubernetes_name
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          action: replace
          targetLabel: kubernetes_node
EOF
```

- kubernetes-service-endpoints-slow

```yaml
cat << EOF | kubectl apply -f -
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMServiceScrape
metadata:
  name: kubernetes-service-endpoints-slow
spec:
  endpoints:
    - port: https
      relabelConfigs:
        - action: drop
          sourceLabels: [__meta_kubernetes_pod_container_init]
        - action: keep_if_equal
          sourceLabels: [__meta_kubernetes_pod_annotation_prometheus_io_port, __meta_kubernetes_pod_container_port_number]
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_scrape_slow]
          action: keep
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_scheme]
          action: replace
          targetLabel: __scheme__
          regex: (https?)
        - sourceLabels:
            [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          targetLabel: __metrics_path__
          regex: (.+)
        - sourceLabels:
            [
              __address__,
              __meta_kubernetes_service_annotation_prometheus_io_port,
            ]
          action: replace
          targetLabel: __address__
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - sourceLabels: [__meta_kubernetes_namespace]
          action: replace
          targetLabel: kubernetes_namespace
        - sourceLabels: [__meta_kubernetes_service_name]
          action: replace
          targetLabel: kubernetes_name
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          action: replace
          targetLabel: kubernetes_node
EOF
```

- because i deploy node exxpoter on ns default so i create this rule for scrape node-expoter metrics

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMPodScrape
metadata:
  name: pod-scrape-default
spec:
  podMetricsEndpoints:
    - port: metrics
      scheme: http
      targetPort: metrics
      path: /metrics
      interval: 20s
      scrapeTimeout: 2s
      honorLabels: false
      honorTimestamps: false
      relabelConfigs:
        - sourceLabels: ["__address__"]
          targetLabel: addr
      metricRelabelConfigs:
        - sourceLabels: ["__address__"]
          targetLabel: addr
  namespaceSelector:
    any: false
    matchNames: ["default"]
```
