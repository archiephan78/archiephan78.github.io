---
author: archiephan
pubDatetime: 2025-07-17T08:15:41Z
modDatetime: 2025-07-17T07:41:26Z
title: "VictoriaMetrics"
draft: false
tags:
  - monitoring
  - victoriametric
description: VictoriaMetrics
---

# VictoriaMetrics

## What is victoriaMetrics?

- VictoriaMetrics is a fast, cost-effective and scalable monitoring solution and time series database.

- VictoriaMetrics can be used as long-term storage for Prometheus

- VictoriaMetrics supports Prometheus querying API, so it can be used as Prometheus drop-in replacement in Grafana.

- VictoriaMetrics implements MetricsQL query language backwards compatible with PromQL.

- Uses 10x less RAM than InfluxDB and up to 7x less RAM than Prometheus, Thanos or Cortex when dealing with millions of unique time series

- Cluster supported

![](@/assets/images/notes/victoria-cluster.png)

## VictoriaMetrics cluster install

![](@/assets/images/notes/Untitled.png)

- On all nodes we install vmselect for query, vmstorage for store time series data, vminsert accepts the ingested data and spreads it among vmstorage

### Get started:

- Download pakage on all node

```bash
mkdir victoriametric-binary
cd victoriametric-binary
wget https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/v1.63.0/victoria-metrics-amd64-v1.63.0-cluster.tar.gz
tar -xvzf victoria-metrics-amd64-v1.63.0-cluster.tar.gz
ls
victoria-metrics-amd64-v1.63.0-cluster.tar.gz  vminsert-prod  vmselect-prod  vmstorage-prod
```

#### Install vmstorage on three node

- Create folder for store database and create systemd file, we config retentionPeriod for 3 days::

```bash
mkdir /opt/metric-storage
cp vmstorage-prod /bin/
mkdir /var/log/vmstorage
IP=`hostname -I | awk '{print $1}'`
cat << EOF > /etc/systemd/system/vmstorage.service
[Unit]
Description=vmstorage systemd service.

[Service]
User=root
Type=simple
ExecStart=/bin/vmstorage-prod -storageDataPath /opt/metric-storage -retentionPeriod 3d -httpListenAddr $IP:8482 -vminsertAddr $IP:8400 -vmselectAddr $IP:8401
Restart=always
StandardOutput=file:/var/log/vmstorage/vmstorage.log

[Install]
WantedBy=multi-user.target
EOF
chmod 644 /etc/systemd/system/vmstorage.service
systemctl start vmstorage
systemctl status vmstorage
```

#### Install vmselect

- Create systemd file, config vmselect storage path to all vmstorage node:

```bash
cp vmselect-prod /bin/
mkdir /var/log/vmselect/
IP=`hostname -I | awk '{print $1}'`
cat << EOF > /etc/systemd/system/vmselect.service
[Unit]
Description=vmselect systemd service.

[Service]
User=root
Type=simple
ExecStart=/bin/vmselect-prod  -httpListenAddr $IP:8481 -storageNode=192.168.78.185:8401 -storageNode=192.168.78.214:8401 -storageNode=192.168.78.237:8401
Restart=always
StandardOutput=file:/var/log/vmselect/vmselect.log

[Install]
WantedBy=multi-user.target
EOF
chmod 644 /etc/systemd/system/vmselect.service
systemctl start vmselect
systemctl status vmselect
```

### Install vminsert

- Create systemd file, config vminsert storage path to all vmstorage node:

```bash
cp vminsert-prod /bin/
mkdir /var/log/vminsert/
IP=`hostname -I | awk '{print $1}'`
cat << EOF > /etc/systemd/system/vminsert.service
[Unit]
Description=vminsert systemd service.

[Service]
User=root
Type=simple
ExecStart=/bin/vminsert-prod  -httpListenAddr $IP:8480 -storageNode=192.168.78.185:8400 -storageNode=192.168.78.214:8400 -storageNode=192.168.78.237:8400
Restart=always
StandardOutput=file:/var/log/vminsert/vminsert.log

[Install]
WantedBy=multi-user.target
EOF
chmod 644 /etc/systemd/system/vminsert.service
systemctl start vminsert
systemctl status vminsert
```

### Config nginx for vmselect and vminsert

```bash
cat << EOF > /etc/nginx/sites-enabledvictoriametrics
   upstream vminsert {
      server 192.168.78.185:8480;
      server 192.168.78.214:8480;
      server 192.168.78.237:8480;
   }

   upstream vmselect {
      server 192.168.78.185:8481;
      server 192.168.78.214:8481;
      server 192.168.78.237:8481;
   }

   server {
      listen 192.168.78.78:8480;
      location / {
          proxy_pass http://vminsert;
      }
   }

   server {
      listen 192.168.78.78:8481;
      location / {
          proxy_pass http://vmselect;
      }
   }
EOF
nginx -t
systemctl restart nginx
```

#### Config prometheus rewrite to victoriametrics

- Install and config prometheus

```yaml
docker-compose.yml
version: '3.7'

volumes:
    prometheus_data: {}

networks:
  front-tier:
  back-tier:

services:

  prometheus:
    image: prom/prometheus:v2.1.0
    volumes:
      - ./prom/:/etc/prometheus/
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    ports:
      - 9090:9090
    restart: always

  node-exporter:
    image: prom/node-exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - --collector.filesystem.ignored-mount-points
      - "^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)"
    ports:
      - 9100:9100
    restart: always
```

- Config prometheus remote_write to vmselect via nginx:

```bash
root@santafe-1:~/prometheus# cat prom/prometheus.yml
# my global config
global:
  scrape_interval:     15s # By default, scrape targets every 15 seconds.
  evaluation_interval: 15s # By default, scrape targets every 15 seconds.
  # scrape_timeout is set to the global default (10s).

  # Attach these labels to any time series or alerts when communicating with
  # external systems (federation, remote storage, Alertmanager).

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.

  - job_name: 'prometheus'

    # Override the global default and scrape targets from this job every 5 seconds.
    scrape_interval: 5s

    static_configs:
         - targets: ['localhost:9090']

  - job_name: 'node_exporter'

    # Override the global default and scrape targets from this job every 5 seconds.
    scrape_interval: 5s

    static_configs:
         - targets: ['192.168.78.185:9100']

remote_write:
  - url: "http://192.168.78.78:8480/insert/0/prometheus/api/v1/write"
```

#### Query example:

- URLs for Prometheus querying API: http://<nginx>:8481/select/<accountID>/prometheus/<suffix>

- <accountID> is an arbitrary 32-bit integer identifying namespace for data ingestion (aka tenant). It is possible to set it as accountID:projectID, where projectID is also arbitrary 32-bit integer. If projectID isn't set, then it equals to 0

- a suffix is PromQL instant query.(read Prometheus docs)

- Example query:

```bash
root@santafe-1:~/prometheus# curl http://192.168.78.78:8481/select/0/prometheus/api/v1/labels
{"status":"success","isPartial":false,"data":["__name__","address","branch","broadcast","call","cause","code","collector","cpu","device","dialer_name","domainname","duplex","endpoint","event","fstype","goversion","handler","instance","interval","ip","job","le","listener_name","machine","method","mode","mountpoint","name","nodename","operstate","quantile","queue","reason","release","revision","role","scrape_job","slice","sysname","time_zone","type","version"]}

root@santafe-1:~/prometheus# curl http://192.168.78.78:8481/select/0/prometheus/api/v1/query?query=node_load1
{"status":"success","isPartial":false,"data":{"resultType":"vector","result":[{"metric":{"__name__":"node_load1","instance":"192.168.78.185:9100","job":"node_exporter"},"value":[1629234854,"0.01"]}]}}
```

#### Grafana integration

- Config data source type prometheus with urrk http://192.168.78.78:8481/select/0/prometheus/

- Add dasshboard for node exporter:

![](@/assets/images/notes/n.png)
