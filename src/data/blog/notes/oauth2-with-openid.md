---
author: archiephan
pubDatetime: 2020-08-17T19:20:35Z
modDatetime: 2025-07-17T06:37:41Z
title: "OAuth2 with Openstack Keystone"
draft: false
tags:
  - Openstack
  - Oauth2
description: OAuth2 with Openstack Keystone!
ogImage: https://github.com/user-attachments/assets/4da0be5a-f580-4778-ac0c-cbb97dfe8da0
---

# OAuth2 with Openstack Keystone

## 1. OAuth2 là gì?

- Nó là viết tắt của Open với <b>Authentication</b> hoặc <b>Authorization</b>

- OAuth ra đời nhằm giải quyết vấn đề trên và xa hơn nữa, đây là một phương thức chứng thực giúp các ứng dụng có thể chia sẻ tài nguyên với nhau mà không cần chia sẻ thông tin username và password.

## 2. OAuth2 Roles

- OAuth define 4 roles:

  - <b> Resource Owner:</b> là user đã authorizes vào application để access account của user. Quyền truy cập của application vào account của user bị giới hạn trong phạm vi ủy quyền được cấp.

  - <b>Client:</b> là application

  - <b>Resource Server:</b> là server chứa resource user muốn access

  - <b>Authorization Server:</b> là server verify thông tin của user để cấp token issue cho client

## 3. Abstract Protocol Flow:

- Abstract flow

![](@/assets/images/notes/abstract_flow.png)

## 4. Application Registration(client):

- Client có 3 thành phần:

  - application name
  - Redirect URI hay là callback URL
  - application website

- Khi khởi tạo application(client OAut) với service, thì service sẽ đóng vai trò là IDP (Identity Provider)

- Mỗi client sẽ sinh ra 1 ClientID và Client secret

## 5. Grant Type:

- OAuth2 hỗ trợ 6 kiểu grand type:

  - authorization_code (phổ biến nhất)
  - implicit
  - refresh_token
  - password
  - client_credentials
  - hybird flow

- Ở đây chúng ta sẽ đi sâu tìm hiểu về implicit vì openstack sử dụng nó với sự hỗ trợ của mod_auth_openidc

## 6. Keystone openid flow

- Khi tích hợp keystone authentication sử dụng OAuth2 thì keystone khi đấy sẽ trở thành Service Provider(SP) và Authencation Server sẽ trở thành Identity Provider (IDP)

- Grand flow chi tiết của http với mod_auth_openidc và keystone openstack:

![](@/assets/images/notes/implict.png)

- [1],[2] User thực hiện truy cập vào horizon và chọn phương thức login với openid, horizon sẽ trả về redirect đến endpoint /v3/auth/OS-FEDERATION/websso/ của keystone(httpd)

- [3] Khi truy cập đến endpoint /v3/auth/OS-FEDERATION/websso/ từ browser thì mod_auth_openidc redirect đến URI của IdP đã khai báo trước đó trong keystone cùng với client_id đc config trong httpd mod_auth_openidc module

- [4] Sau login thành công ở IdP thì IdP sẽ sinh ra 1 code lưu trên idp (nonce) và trả về cho browser với response sẽ redirect về /v3/auth/OS-FEDERATION/websso/ cùng với code nonce

- [5] + [6] Browser của user mang code nonce này truy cập đến endpoint /v3/auth/OS-FEDERATION/websso/ và httpd sẽ mang code này để lấy thông tin của user trên IdP. IdP sẽ trả ra access code, token id và thông tin của user cho trả về cho user

- [7] user sẽ mang thông tin lấy đc từ [5] và [6] để gửi lên endpoint /v3/auth/OS-FEDERATION/websso/mapped của keystone để kiểm tra thông tin của user đang có từ IdP với thông tin về quyền hạn của user đó trong keystone (authorized)

- [8] Sau khi keystone lấy thôgn tin từ user ở [7] và kiểm tra thành công thì sẽ cấp scope token cho user để được đăng nhập và sử dụng hệ thống

### Trên đây là các bước flow chi tiết khi keystone sử dụng OAuth2 làm Authentication. Tuy nhiên có 1 số lưu ý khi sử dụng mod_auth_openidc của http như:

- Mỗi bước trên thì sẽ có state và state id tương ứng và state này được mod_auth_openidc lưu mặc định trong RAM, nếu sử dụng nhiều keystone thì cần config mod_auth_openidc sử dụng cache engine khác như Redis, memcached

- Mặc định session duration của mod_auth_openidc là 8 tiếng, nên set là 0 để mặc định bằng với expire time của id_token trên idP

- expire time trên idP nên set bằng với expire time của keystone token
