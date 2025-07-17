---
author: archiephan
pubDatetime: 2025-07-17T08:15:41Z
modDatetime: 2025-07-17T07:41:26Z
title: "VictoriaMetrics on K8s"
draft: false
tags:
  - monitoring
  - victoriametric
  - K8S
description: VictoriaMetrics K8S
---

# Install VictoriaMetrics on K8S

- In previous section we deployed VMs cluster on a baremetal. in this part we will deploy VMs cluster on K8S and some vmalert demo

![](@/assets/images/notes/guide-vmcluster-k8s-scheme.png)

- Requirement:

  - Helm 3 <a href='https://helm.sh/docs/intro/install/'>
  - kubectl <a href='https://kubernetes.io/docs/tasks/tools/'>

- Im using Kubenestes Engine by <a href='https://bizflycloud.vn/kubernetes-engine'> BizFlyCloud </a> for fast provisioning managed K8S cluster

- Add helm repo

```bash
helm repo add vm https://victoriametrics.github.io/helm-charts/
helm repo update
```

- Verify that helm added

```bash
➜ helm search repo vm/
NAME                         	CHART VERSION	APP VERSION	DESCRIPTION
vm/victoria-metrics-agent    	0.8.10       	v1.78.0    	Victoria Metrics Agent - collects metrics from ...
vm/victoria-metrics-alert    	0.4.33       	v1.78.0    	Victoria Metrics Alert - executes a list of giv...
vm/victoria-metrics-auth     	0.2.51       	1.78.0     	Victoria Metrics Auth - is a simple auth proxy ...
vm/victoria-metrics-cluster  	0.9.30       	1.78.0     	Victoria Metrics Cluster version - high-perform...
vm/victoria-metrics-gateway  	0.1.8        	1.78.0     	Victoria Metrics Gateway - Auth & Rate-Limittin...
vm/victoria-metrics-k8s-stack	0.9.5        	1.78.0     	Kubernetes monitoring on VictoriaMetrics stack....
vm/victoria-metrics-operator 	0.10.3       	0.25.1     	Victoria Metrics Operator
vm/victoria-metrics-single   	0.8.31       	1.78.0     	Victoria Metrics Single version - high-performa...
```

- Change helm value

```bash
cat <<EOF | helm install vmcluster vm/victoria-metrics-cluster -f -
vmselect:
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8481"

vminsert:
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8480"

vmstorage:
  persistentVolume:
      enabled: "true"
      storageClass: "premium-ssd"
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8482"
EOF
```

- By running `helm install vmcluster vm/victoria-metrics-cluster` we install `VictoriaMetrics cluster` to default `namespace` inside cluster

- By adding `podAnnotations: prometheus.io/scrape: "true"` we enable the scraping of metrics from the vmselect, vminsert and vmstorage pods.

- By adding `podAnnotations:prometheus.io/port: "some_port"` we enable the scraping of metrics from the vmselect, vminsert and vmstorage pods from their ports as well.

- By adding `storageClass: "premium-ssd"`, im using SSD volume for vmstorage (default in BizFlyCloud is hdd)

- Here is output:

```bash
➜ cat <<EOF | helm install vmcluster vm/victoria-metrics-cluster -f -
vmselect:
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8481"

vminsert:
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8480"

vmstorage:
  persistentVolume:
      enabled: "true"
      storageClass: "premium-ssd"
  podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8482"
EOF
W0707 11:30:11.773345   30007 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W0707 11:30:12.896258   30007 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
NAME: vmcluster
LAST DEPLOYED: Thu Jul  7 11:30:10 2022
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Write API:

The Victoria Metrics write api can be accessed via port 8480 with the following DNS name from within your cluster:
vmcluster-victoria-metrics-cluster-vminsert.default.svc.cluster.local

Get the Victoria Metrics insert service URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace default -l "app=vminsert" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace default port-forward $POD_NAME 8480

You need to update your Prometheus configuration file and add the following lines to it:

prometheus.yml

    remote_write:
      - url: "http://<insert-service>/insert/0/prometheus/"



for example -  inside the Kubernetes cluster:

    remote_write:
      - url: "http://vmcluster-victoria-metrics-cluster-vminsert.default.svc.cluster.local:8480/insert/0/prometheus/"
Read API:

The VictoriaMetrics read api can be accessed via port 8481 with the following DNS name from within your cluster:
vmcluster-victoria-metrics-cluster-vmselect.default.svc.cluster.local

Get the VictoriaMetrics select service URL by running these commands in the same shell:
  export POD_NAME=$(kubectl get pods --namespace default -l "app=vmselect" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace default port-forward $POD_NAME 8481

You need to specify select service URL into your Grafana:
 NOTE: you need to use the Prometheus Data Source

Input this URL field into Grafana

    http://<select-service>/select/0/prometheus/


for example - inside the Kubernetes cluster:

    http://vmcluster-victoria-metrics-cluster-vmselect.default.svc.cluster.local:8481/select/0/prometheus/
```

- We can verify

```bash
➜ kubectl get pods -o wide
NAME                                                           READY   STATUS    RESTARTS   AGE     IP            NODE                                           NOMINATED NODE   READINESS GATES
vmcluster-victoria-metrics-cluster-vminsert-9f9f844cc-fn99z    1/1     Running   0          3m57s   10.200.0.8    pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>
vmcluster-victoria-metrics-cluster-vminsert-9f9f844cc-sjgb5    1/1     Running   0          3m57s   10.200.0.5    pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>
vmcluster-victoria-metrics-cluster-vmselect-75b77ffd66-g42qb   1/1     Running   0          3m57s   10.200.0.6    pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>
vmcluster-victoria-metrics-cluster-vmselect-75b77ffd66-lszvk   1/1     Running   0          3m57s   10.200.0.7    pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>
vmcluster-victoria-metrics-cluster-vmstorage-0                 1/1     Running   0          3m57s   10.200.0.9    pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>
vmcluster-victoria-metrics-cluster-vmstorage-1                 1/1     Running   0          2m58s   10.200.0.10   pool-io8z1y3o-2tmpa93tbaza1mma-node-frxbftnn   <none>           <none>

➜ kubectl get svc -o wide
NAME                                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE     SELECTOR
kubernetes                                     ClusterIP   10.93.0.1       <none>        443/TCP                      118m    <none>
vmcluster-victoria-metrics-cluster-vminsert    ClusterIP   10.93.56.130    <none>        8480/TCP                     5m13s   app.kubernetes.io/instance=vmcluster,app.kubernetes.io/name=victoria-metrics-cluster,app=vminsert
vmcluster-victoria-metrics-cluster-vmselect    ClusterIP   10.93.238.187   <none>        8481/TCP                     5m13s   app.kubernetes.io/instance=vmcluster,app.kubernetes.io/name=victoria-metrics-cluster,app=vmselect
vmcluster-victoria-metrics-cluster-vmstorage   ClusterIP   None            <none>        8482/TCP,8401/TCP,8400/TCP   5m13s   app.kubernetes.io/instance=vmcluster,app.kubernetes.io/name=victoria-metrics-cluster,app=vmstorage

➜ kubectl get pvc -o wide
NAME                                                              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE     VOLUMEMODE
vmstorage-volume-vmcluster-victoria-metrics-cluster-vmstorage-0   Bound    pvc-67a13278-3b46-4bef-bb46-9628c4b762f2   8Gi        RWO            premium-ssd    6m18s   Filesystem
vmstorage-volume-vmcluster-victoria-metrics-cluster-vmstorage-1   Bound    pvc-c180d36f-c3e9-4e32-833a-5b1edf3f22d9   8Gi        RWO            premium-ssd    5m19s   Filesystem
```

- Note: vmselect has vmui at URL `<URL>/select/0/prometheus/vmui/`

- Next we will install vm-agent for scrape metric form kube-api server and kubelet and node exporter

- Install `node-exporter`:

```yaml
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: default
  labels:
    k8s-app: node-exporter
spec:
  selector:
    matchLabels:
      k8s-app: node-exporter
  template:
    metadata:
      labels:
        k8s-app: node-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: node-exporter
          image: quay.io/prometheus/node-exporter:v1.1.2
          ports:
            - name: metrics
              containerPort: 9100
          args:
            - "--path.procfs=/host/proc"
            - "--path.sysfs=/host/sys"
            - "--path.rootfs=/host"
          volumeMounts:
            - name: dev
              mountPath: /host/dev
            - name: proc
              mountPath: /host/proc
            - name: sys
              mountPath: /host/sys
            - name: rootfs
              mountPath: /host
      volumes:
        - name: dev
          hostPath:
            path: /dev
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
        - name: rootfs
          hostPath:
            path: /
      hostPID: true
      hostNetwork: true
      tolerations:
        - operator: "Exists"
```

- Deploy `kube-state-metrics` for monitors Kubernetes API Server and generate metrics about the state of the object

```bash
git clone https://github.com/kubernetes/kube-state-metrics.git -b release-2.5
cd kube-state-metrics/examples/autosharding
kubectl apply -f ./
```

- Create file `guide-vmcluster-vmagent-values.yaml`

```yaml
remoteWriteUrls:
  - http://vmcluster-victoria-metrics-cluster-vminsert.default.svc.cluster.local:8480/insert/0/prometheus/

config:
  global:
    scrape_interval: 10s

  scrape_configs:
    - job_name: "vmalalert"
      static_configs:
        - targets:
            [
              "vmalert-victoria-metrics-alert-server.default.svc.cluster.local:8880",
            ]
    - job_name: "kube-state-metrics"
      static_configs:
        - targets: ["kube-state-metrics.kube-system.svc.cluster.local:8080"]
    - job_name: vmagent
      static_configs:
        - targets: ["localhost:8429"]
    - job_name: "kubernetes-apiservers"
      kubernetes_sd_configs:
        - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
        - source_labels:
            [
              __meta_kubernetes_namespace,
              __meta_kubernetes_service_name,
              __meta_kubernetes_endpoint_port_name,
            ]
          action: keep
          regex: default;kubernetes;https
    - job_name: "kubernetes-nodes"
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
        - role: node
      relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/$1/proxy/metrics
    - job_name: "kubernetes-nodes-cadvisor"
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
        - role: node
      relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/$1/proxy/metrics/cadvisor
      metric_relabel_configs:
        - action: replace
          source_labels: [pod]
          regex: "(.+)"
          target_label: pod_name
          replacement: "${1}"
        - action: replace
          source_labels: [container]
          regex: "(.+)"
          target_label: container_name
          replacement: "${1}"
        - action: replace
          target_label: name
          replacement: k8s_stub
        - action: replace
          source_labels: [id]
          regex: '^/system\.slice/(.+)\.service$'
          target_label: systemd_service_name
          replacement: "${1}"
    - job_name: "kubernetes-service-endpoints"
      kubernetes_sd_configs:
        - role: endpoints
      relabel_configs:
        - action: drop
          source_labels: [__meta_kubernetes_pod_container_init]
          regex: true
        - action: keep_if_equal
          source_labels:
            [
              __meta_kubernetes_pod_annotation_prometheus_io_port,
              __meta_kubernetes_pod_container_port_number,
            ]
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_scheme]
          action: replace
          target_label: __scheme__
          regex: (https?)
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels:
            [
              __address__,
              __meta_kubernetes_service_annotation_prometheus_io_port,
            ]
          action: replace
          target_label: __address__
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          action: replace
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_service_name]
          action: replace
          target_label: kubernetes_name
        - source_labels: [__meta_kubernetes_pod_node_name]
          action: replace
          target_label: kubernetes_node
    - job_name: "kubernetes-service-endpoints-slow"
      scrape_interval: 5m
      scrape_timeout: 30s
      kubernetes_sd_configs:
        - role: endpoints
      relabel_configs:
        - action: drop
          source_labels: [__meta_kubernetes_pod_container_init]
          regex: true
        - action: keep_if_equal
          source_labels:
            [
              __meta_kubernetes_pod_annotation_prometheus_io_port,
              __meta_kubernetes_pod_container_port_number,
            ]
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_scrape_slow]
          action: keep
          regex: true
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_scheme]
          action: replace
          target_label: __scheme__
          regex: (https?)
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels:
            [
              __address__,
              __meta_kubernetes_service_annotation_prometheus_io_port,
            ]
          action: replace
          target_label: __address__
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          action: replace
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_service_name]
          action: replace
          target_label: kubernetes_name
        - source_labels: [__meta_kubernetes_pod_node_name]
          action: replace
          target_label: kubernetes_node
    - job_name: "kubernetes-services"
      metrics_path: /probe
      params:
        module: [http_2xx]
      kubernetes_sd_configs:
        - role: service
      relabel_configs:
        - source_labels:
            [__meta_kubernetes_service_annotation_prometheus_io_probe]
          action: keep
          regex: true
        - source_labels: [__address__]
          target_label: __param_target
        - target_label: __address__
          replacement: blackbox
        - source_labels: [__param_target]
          target_label: instance
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_service_name]
          target_label: kubernetes_name
    - job_name: "kubernetes-pods"
      kubernetes_sd_configs:
        - role: pod
      relabel_configs:
        - action: drop
          source_labels: [__meta_kubernetes_pod_container_init]
          regex: true
        - action: keep_if_equal
          source_labels:
            [
              __meta_kubernetes_pod_annotation_prometheus_io_port,
              __meta_kubernetes_pod_container_port_number,
            ]
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels:
            [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
          target_label: __address__
        - action: labelmap
          regex: __meta_kubernetes_pod_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          action: replace
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_pod_name]
          action: replace
          target_label: kubernetes_pod_name
```

- Install `vmagent` via helm

```bash
➜ helm install vmagent vm/victoria-metrics-agent -f  guide-vmcluster-vmagent-values.yaml
W0707 11:47:16.213788   30348 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W0707 11:47:16.711587   30348 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
NAME: vmagent
LAST DEPLOYED: Thu Jul  7 11:47:16 2022
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

- Check log of `vmagent` for sure it work

```bash
➜ kubectl logs pod/vmagent-victoria-metrics-agent-57fd5c67d5-2jm5l
{"ts":"2022-07-07T04:47:32.559Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:12","msg":"build version: vmagent-20220621-071016-tags-v1.78.0-0-g091408be6"}
{"ts":"2022-07-07T04:47:32.559Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:13","msg":"command line flags"}
{"ts":"2022-07-07T04:47:32.559Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"envflag.enable\"=\"true\""}
{"ts":"2022-07-07T04:47:32.559Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"envflag.prefix\"=\"VM_\""}
{"ts":"2022-07-07T04:47:32.559Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"loggerFormat\"=\"json\""}
{"ts":"2022-07-07T04:47:32.560Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"promscrape.config\"=\"/config/scrape.yml\""}
{"ts":"2022-07-07T04:47:32.560Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"remoteWrite.tmpDataPath\"=\"/tmpData\""}
{"ts":"2022-07-07T04:47:32.560Z","level":"info","caller":"VictoriaMetrics/lib/logger/flag.go:20","msg":"flag \"remoteWrite.url\"=\"secret\""}
{"ts":"2022-07-07T04:47:32.560Z","level":"info","caller":"VictoriaMetrics/app/vmagent/main.go:101","msg":"starting vmagent at \":8429\"..."}
{"ts":"2022-07-07T04:47:32.560Z","level":"info","caller":"VictoriaMetrics/lib/memory/memory.go:42","msg":"limiting caches to 2476393267 bytes, leaving 1650928845 bytes to the OS according to -memory.allowedPercent=60"}
{"ts":"2022-07-07T04:47:32.575Z","level":"info","caller":"VictoriaMetrics/lib/persistentqueue/fastqueue.go:59","msg":"opened fast persistent queue at \"/tmpData/persistent-queue/1_AA56387F2518752A\" with maxInmemoryBlocks=400, it contains 0 pending bytes"}
{"ts":"2022-07-07T04:47:32.576Z","level":"info","caller":"VictoriaMetrics/app/vmagent/remotewrite/client.go:176","msg":"initialized client for -remoteWrite.url=\"1:secret-url\""}
{"ts":"2022-07-07T04:47:32.576Z","level":"info","caller":"VictoriaMetrics/app/vmagent/main.go:126","msg":"started vmagent in 0.016 seconds"}
{"ts":"2022-07-07T04:47:32.576Z","level":"info","caller":"VictoriaMetrics/lib/promscrape/scraper.go:103","msg":"reading Prometheus configs from \"/config/scrape.yml\""}
{"ts":"2022-07-07T04:47:32.576Z","level":"info","caller":"VictoriaMetrics/lib/httpserver/httpserver.go:93","msg":"starting http server at http://127.0.0.1:8429/"}
{"ts":"2022-07-07T04:47:32.577Z","level":"info","caller":"VictoriaMetrics/lib/httpserver/httpserver.go:94","msg":"pprof handlers are exposed at http://127.0.0.1:8429/debug/pprof/"}
{"ts":"2022-07-07T04:47:32.583Z","level":"info","caller":"VictoriaMetrics/lib/promscrape/config.go:114","msg":"starting service discovery routines..."}
```

- Next we will install Grafana for visualize metrics from VMs

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

- Install Grafana, we using service type `LoadBalancer` for expose grafana dashboard

```bash
cat <<EOF | helm install my-grafana grafana/grafana -f -
  service:
    type: LoadBalancer
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: victoriametrics
          type: prometheus
          orgId: 1
          url: http://vmcluster-victoria-metrics-cluster-vmselect.default.svc.cluster.local:8481/select/0/prometheus/
          access: proxy
          isDefault: true
          updateIntervalSeconds: 10
          editable: true

  dashboardProviders:
   dashboardproviders.yaml:
     apiVersion: 1
     providers:
     - name: 'default'
       orgId: 1
       folder: ''
       type: file
       disableDeletion: true
       editable: true
       options:
         path: /var/lib/grafana/dashboards/default

  dashboards:
    default:
      victoriametrics:
        gnetId: 11176
        revision: 18
        datasource: victoriametrics
      vmagent:
        gnetId: 12683
        revision: 7
        datasource: victoriametrics
      kubernetes:
        gnetId: 14205
        revision: 1
        datasource: victoriametrics
EOF
W0707 12:45:12.018558   30830 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W0707 12:45:12.095824   30830 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W0707 12:45:13.962861   30830 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W0707 12:45:13.965152   30830 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
NAME: my-grafana
LAST DEPLOYED: Thu Jul  7 12:45:11 2022
NAMESPACE: default
STATUS: deployed
REVISION: 1
```

- Get Grafana admin password:

```bash
kubectl get secret --namespace default my-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

- kube-state-metric grafana dashboard: https://grafana.com/grafana/dashboards/13332

- vmalert grafana dashboard: https://grafana.com/grafana/dashboards/14950

![](@/assets/images/notes/grafana.png)

- Create config-map for `vmalert`:

```bash
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: vmalert-victoria-metrics-alert-server-alert-rules-config
  namespace: default
data:
  alert-rules.yaml: |-
    groups:
    - name: k8s
        rules:
        - alert: KubernetesNodeReady
            expr: kube_node_status_condition{condition="Ready",status="true"} == 0
            for: 5m
            labels:
            alert_level: high
            alert_type: state
            alert_source_type: k8s
            annotations:
            summary: "Kubernetes Node ready (instance {{ $labels.instance }})"
            description: "Node {{ $labels.node }} has been unready for a long time\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: KubernetesMemoryPressure
            expr: kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
            for: 5m
            labels:
            alert_level: middle
            alert_type: mem
            alert_source_type: k8s
            annotations:
            summary: "Kubernetes memory pressure (instance {{ $labels.instance }})"
            description: "{{ $labels.node }} has MemoryPressure condition\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: KubernetesPodCrashLooping
            expr: rate(kube_pod_container_status_restarts_total[15m]) * 60 * 5 > 5
            for: 5m
            labels:
            alert_level: middle
            alert_type: state
            alert_source_type: k8s
            annotations:
            summary: "Kubernetes pod crash looping (instance {{ $labels.instance }})"
            description: "Pod {{ $labels.pod }} is crash looping\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
    ##pod
    - name: pod
        rules:
        - alert: ContainerMemoryUsage
            expr: (sum(container_memory_working_set_bytes) BY (instance, name) / sum(container_spec_memory_limit_bytes > 0) BY (instance, name) * 100) > 80
            for: 5m
            labels:
            alert_level: middle
            alert_type: mem
            alert_source_type: pod
            annotations:
            summary: "Container Memory usage (instance {{ $labels.instance }})"
            description: "Container Memory usage is above 80%\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
    ##kvm
    - name: kvm
        rules:
        - alert: VirtualMachineDown
            expr: up{machinetype="virtualmachine"} == 0
            for: 2m
            labels:
            alert_level: high
            alert_type: state
            alert_source_type: kvm
            annotations:
            summary: "Prometheus VirtualmachineMachine target missing (instance {{ $labels.instance }})"
            description: "A Prometheus VirtualMahine target has disappeared. An exporter might be crashed.\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostUnusualDiskWriteLatency
            expr: rate(node_disk_write_time_seconds_total{machinetype="virtualmachine"}[1m]) / rate(node_disk_writes_completed_total{machinetype="virtualmachine"}[1m]) > 100
            for: 5m
            labels:
            alert_level: middle
            alert_type: disk
            alert_source_type: kvm
            annotations:
            summary: "Host unusual disk write latency (instance {{ $labels.instance }})"
            description: "Disk latency is growing (write operations > 100ms)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostHighCpuLoad
            expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle",machinetype="virtualmachine"}[5m])) * 100) > 80
            for: 5m
            labels:
            alert_level: middle
            alert_type: cpu
            alert_source_type: kvm
            annotations:
            summary: "Host high CPU load (instance {{ $labels.instance }})"
            description: "CPU load is > 80%\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostSwapIsFillingUp
            expr: (1 - (node_memory_SwapFree_bytes{machinetype="virtualmachine"} / node_memory_SwapTotal_bytes{machinetype="virtualmachine"})) * 100 > 80
            for: 5m
            labels:
            alert_level: middle
            alert_type: mem
            alert_source_type: kvm
            annotations:
            summary: "Host swap is filling up (instance {{ $labels.instance }})"
            description: "Swap is filling up (>80%)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostUnusualNetworkThroughputIn
            expr: sum by (instance) (irate(node_network_receive_bytes_total{machinetype="virtualmachine"}[2m])) / 1024 / 1024 > 100
            for: 5m
            labels:
            alert_level: middle
            alert_type: network
            alert_source_type: kvm
            annotations:
            summary: "Host unusual network throughput in (instance {{ $labels.instance }})"
            description: "Host network interfaces are probably receiving too much data (> 100 MB/s)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostOutOfMemory
            expr: node_memory_MemAvailable_bytes{machinetype="virtualmachine"} / node_memory_MemTotal_bytes{machinetype="virtualmachine"} * 100 < 10
            for: 5m
            labels:
            alert_level: middle
            alert_type: mem
            alert_source_type: kvm
            annotations:
            summary: "Host out of memory (instance {{ $labels.instance }})"
            description: "Node memory is filling up (< 10% left)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
            description: "The node is under heavy memory pressure. High rate of major page faults\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
    #node-exporter
    - name: machine
        rules:
        - alert: MachineDown
            expr: up{machinetype="physicalmachine"} == 0
            for: 2m
            labels:
            alert_level: high
            alert_type: state
            alert_source_type: machine
            annotations:
            summary: "Prometheus Machine target missing (instance {{ $labels.instance }})"
            description: "A Prometheus Mahine target has disappeared. An exporter might be crashed.\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostUnusualDiskWriteLatency
            expr: rate(node_disk_write_time_seconds_total{machinetype="physicalmachine"}[1m]) / rate(node_disk_writes_completed_total{machinetype="physicalmachine"}[1m]) > 100
            for: 5m
            labels:
            alert_level: middle
            alert_type: disk
            alert_source_type: machine
            annotations:
            summary: "Host unusual disk write latency (instance {{ $labels.instance }})"
            description: "Disk latency is growing (write operations > 100ms)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostHighCpuLoad
            expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle",machinetype="physicalmachine"}[5m])) * 100) > 80
            for: 5m
            labels:
            alert_level: middle
            alert_type: cpu
            alert_source_type: machine
            annotations:
            summary: "Host high CPU load (instance {{ $labels.instance }})"
            description: "CPU load is > 80%\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostSwapIsFillingUp
            expr: (1 - (node_memory_SwapFree_bytes{machinetype="physicalmachine"} / node_memory_SwapTotal_bytes{machinetype="physicalmachine"})) * 100 > 80
            for: 5m
            labels:
            alert_level: middle
            alert_type: state
            alert_source_type: machine
            annotations:
            summary: "Host swap is filling up (instance {{ $labels.instance }})"
            description: "Swap is filling up (>80%)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostUnusualNetworkThroughputIn
            expr: sum by (instance) (irate(node_network_receive_bytes_total{machinetype="physicalmachine"}[2m])) / 1024 / 1024 > 100
            for: 5m
            labels:
            alert_level: middle
            alert_type: network
            alert_source_type: machine
            annotations:
            summary: "Host unusual network throughput in (instance {{ $labels.instance }})"
            description: "Host network interfaces are probably receiving too much data (> 100 MB/s)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostOutOfMemory
            expr: node_memory_MemAvailable_bytes{machinetype="physicalmachine"} / node_memory_MemTotal_bytes{machinetype="physicalmachine"} * 100 < 10
            for: 5m
            labels:
            alert_level: middle
            alert_type: mem
            alert_source_type: machine
            annotations:
            summary: "Host out of memory (instance {{ $labels.instance }})"
            description: "Node memory is filling up (< 10% left)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
            description: "The node is under heavy memory pressure. High rate of major page faults\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostOutOfDiskSpace
            expr: (node_filesystem_avail_bytes{machinetype="physicalmachine"} * 100) / node_filesystem_size_bytesi{machinetype="physicalmachine"} < 10
            for: 5m
            labels:
            alert_level: middle
            alert_type: disk
            alert_source_type: machine
            annotations:
            summary: "Host out of disk space (instance {{ $labels.instance }})"
            description: "Disk is almost full (< 10% left)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostDiskWillFillIn4Hours
            expr: predict_linear(node_filesystem_free_bytes{fstype!~"tmpfs",machinetype="physicalmachine"}[1h], 4 * 3600) < 0
            for: 5m
            labels:
            alert_level: middle
            alert_type: disk
            alert_source_type: machine
            annotations:
            summary: "Host disk will fill in 4 hours (instance {{ $labels.instance }})"
            description: "Disk will fill in 4 hours at current write rate\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostOutOfInodes
            expr: node_filesystem_files_free{mountpoint ="/rootfs",machinetype="physicalmachine"} / node_filesystem_files{mountpoint ="/rootfs",machinetype="physicalmachine"} * 100 < 10
            for: 5m
            labels:
            alert_level: middle
            alert_type: disk
            alert_source_type: machine
            annotations:
            summary: "Host out of inodes (instance {{ $labels.instance }})"
            description: "Disk is almost running out of available inodes (< 10% left)\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostOomKillDetected
            expr: increase(node_vmstat_oom_kill{machinetype="physicalmachine"}[5m]) > 0
            for: 5m
            labels:
            alert_level: middle
            alert_type: state
            alert_source_type: machine
            annotations:
            summary: "Host OOM kill detected (instance {{ $labels.instance }})"
            description: "OOM kill detected\n VALUE = {{ $value }}\n LABELS: {{ $labels }}"
        - alert: HostNetworkTransmitErrors
            expr: increase(node_network_transmit_errs_total{machinetype="physicalmachine"}[5m]) > 0
            for: 5m
            labels:
            alert_level: middle
            alert_type: network
            alert_source_type: machine
            annotations:
            summary: "Host Network Transmit Errors (instance {{ $labels.instance }})"
            description: '{{ $labels.instance }} interface {{ $labels.device }} has encountered {{ printf "%.0f" $value }} transmit errors in the last five minutes.\n VALUE = {{ $value }}\n LABELS: {{ $labels }}'
EOF
```

- Next we install and config vmalert

```bash
➜ cat <<EOF | helm install vmalert vm/victoria-metrics-alert -f -
server:
  datasource:
    url: "http://vmcluster-victoria-metrics-cluster-vmselect.default.svc.cluster.local:8481/select/0/prometheus/"
  remote:
    write:
      url: "http://vmcluster-victoria-metrics-cluster-vminsert.default.svc.cluster.local:8480/insert/0/prometheus/"
  extraArgs:
    envflag.enable: "true"
    envflag.prefix: VM_
    loggerFormat: json
  notifier:
    alertmanager:
      url: "http://vmalert-alertmanager.default.svc.cluster.local:9093"
  configMap: "vmalert-victoria-metrics-alert-server-alert-rules-config"
alertmanager:
  enabled: true
  image: prom/alertmanager
  tag: latest
  config:
    receivers:
      - name: devnull
        telegram_configs:
          - api_url: https://api.telegram.org
            bot_token: "xnxx"
            chat_id: 454062609
            parse_mode: "HTML"
EOF
```

- Optional, create `karma` dashboard for alermanager

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: karma
  name: karma
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: karma
  template:
    metadata:
      labels:
        app: karma
    spec:
      containers:
        - image: ghcr.io/prymitive/karma:v0.85
          name: karma
          ports:
            - containerPort: 8080
              name: http
          resources:
            limits:
              cpu: 400m
              memory: 400Mi
            requests:
              cpu: 200m
              memory: 200Mi
          env:
            - name: ALERTMANAGER_URI
              value: "http://vmalert-alertmanager.default.svc.cluster.local:9093"
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: karma
  name: karma
  namespace: default
spec:
  ports:
    - name: http
      port: 8080
      targetPort: http
  selector:
    app: karma
  type: NodePort
```

- Optionnal create `promxy` for prometheus proxy for vmselect if dont want use vmui

```yaml
apiVersion: v1
data:
  config.yaml: |
    ### Promxy configuration  Just configure victoriametrics select Component address and interface 
    promxy:
      server_groups:
        - static_configs:
            - targets:
              - vmcluster-victoria-metrics-cluster-vmselect.default.svc.cluster.local:8481
          path_prefix: /select/0/prometheus
kind: ConfigMap
metadata:
  name: promxy-config
  namespace: default
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: promxy
  name: promxy
  namespace: default
spec:
  ports:
    - name: promxy
      port: 8082
      protocol: TCP
      targetPort: 8082
  type: NodePort
  selector:
    app: promxy
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: promxy
  name: promxy
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: promxy
  template:
    metadata:
      labels:
        app: promxy
    spec:
      containers:
        - args:
            - "--config=/etc/promxy/config.yaml"
            - "--web.enable-lifecycle"
          command:
            - "/bin/promxy"
          image: quay.io/jacksontj/promxy:latest
          imagePullPolicy: Always
          livenessProbe:
            httpGet:
              path: "/-/healthy"
              port: 8082
            initialDelaySeconds: 3
          name: promxy
          ports:
            - containerPort: 8082
          readinessProbe:
            httpGet:
              path: "/-/ready"
              port: 8082
            initialDelaySeconds: 3
          volumeMounts:
            - mountPath: "/etc/promxy/"
              name: promxy-config
              readOnly: true

        - args:
            - "--volume-dir=/etc/promxy"
            - "--webhook-url=http://localhost:8082/-/reload"
          image: jimmidyson/configmap-reload:v0.1
          name: promxy-server-configmap-reload
          volumeMounts:
            - mountPath: "/etc/promxy/"
              name: promxy-config
              readOnly: true
      volumes:
        - configMap:
            name: promxy-config
          name: promxy-config
```

![](@/assets/images/notes/promxy.png)
