---
author: archiephan
pubDatetime: 2025-07-17T07:54:52Z
modDatetime: 2025-07-17T07:41:26Z
title: "Cinder CSI"
draft: false
tags:
  - Openstack
  - Cinder
  - Storage
  - K8S
description: Cinder CSI
---

# cinder-csi architect

CSI - **Container Storage Interface**

![](@/assets/images/notes/OpenStack_Cinder_CSI_Plugin.png)

- Cinder CSI Spec :
  - Controller Plugin: is Deployment run on K8S
  - Node Plugin : is K8S daemonset operates on all Worker Nodes
- Cinder CSI Plugin CSI Spec support:

  - Identity Service
  - Controller Service
  - Node Service.

- In Controller plugin run:

  - cinder-csi-plugin: Indicates Cinder CSI Plugin that performs the role of **Controller Plugin** . The cinder-csi-plugin creates a csi.sock file and controls the Cinder according to the requests of other apps of the Controller Plugin Pod delivered through the created csi.sock file. The request is made through CSI's Identity Service and Controller Service Interface.
  - csi-provisioner: Watches changes in PersistentVolumeClaim Object from Kubernetes API Server and sends CSI CreateVolume/DeleteVolume requests to CSI Plugin.
  - csi-attacher: Watches changes in VolumeAttachment Object from Kubernetes API Server and sends CSI ControllerPublish/ControllerUnpublish requests to CSI Plugin.
  - csi-snapshotter: Watches changes in Snapshot CRD (Custom Resource Definition) from Kubernetes API Server and sends CSI CreateSnapshot/DeleteSnapshot requests to CSI Plugin.
  - csi-resizer: Watches changes in the PersistentVolumeClaim Object from the Kubernetes API Server and sends a CSI ControllerExpandVolume request to the CSI Plugin.

- In NodePlugin run:
  - cinder-csi-plugin: Indicates Cinder CSI Plugin that performs the role of **Node Plugin.** cinder-csi-plugin creates a csi.sock file and controls Cinder according to the kubelet request transmitted through the created csi.sock file. The request is made through the Identity Service and Node Service Interface of CSI. The kubelet sends four requests to cinder-csi-plugin: CSI NodeStageVolume/NodeUnstageVolume, and CSI NodePublishVolume/NodeUnpublishVolume.
  - node-driver-register : Register cinder-csi-plugin to kubelet using **Kubelet's Plugin Registration .** The properties also include the path to the csi.sock file of cinder-csi-plugin. kubelet sends a CSI request to cinder-csi-plugin based on the path information of the csi.sock file. The regi.sock file is created by node-driver-register and is used only when registering cinder-csi-plugin to kubelet.
- cinder-csi-plugin belongs to the OpenStack Provider Project, and the rest of the apps belong to the Kubernetes CSI Project. When using other CSI Plugin, only cinder-csi-plugin needs to be replaced with the desired CSI Plugin.

- Reference
  - [https://github.com/container-storage-interface/spec/blob/master/spec.md](https://github.com/container-storage-interface/spec/blob/master/spec.md)
  - [https://kubernetes-csi.github.io/docs/](https://kubernetes-csi.github.io/docs/)
  - [https://medium.com/google-cloud/understanding-the-container-storage-interface-csi-ddbeb966a3b](https://medium.com/google-cloud/understanding-the-container-storage-interface-csi-ddbeb966a3b)
  - [https://docs.docker.com/ee/ucp/kubernetes/storage/use-csi/](https://docs.docker.com/ee/ucp/kubernetes/storage/use-csi/)
  - CSI Spec : [https://github.com/container-storage-interface/spec/blob/master/spec.md](https://github.com/container-storage-interface/spec/blob/master/spec.md)
  - csi-attache: [https://github.com/kubernetes-csi/external-attache](https://github.com/kubernetes-csi/external-attacher)
  - csi-provioner : [https://github.com/kubernetes-csi/external-provisioner](https://github.com/kubernetes-csi/external-provisioner)
  - csi-snapshotter : [https://github.com/kubernetes-csi/external-snapshotter](https://github.com/kubernetes-csi/external-snapshotter)
  - csi-resizer : [https://github.com/kubernetes-csi/external-resizer](https://github.com/kubernetes-csi/external-resizer)
  - node-driver-registrar : [https://github.com/kubernetes-csi/node-driver-registrar](https://github.com/kubernetes-csi/node-driver-registrar)
  - cinder-csi-plugin : [https://github.com/kubernetes/cloud-provider-openstack/blob/master/docs/using-cinder-csi-plugin.md](https://github.com/kubernetes/cloud-provider-openstack/blob/master/docs/using-cinder-csi-plugin.md)
  - Device plugin registration : [https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/#device-plugin-registration](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/#device-plugin-registration)
