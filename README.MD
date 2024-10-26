利用CF worker做一个简单的DDNS服务，用于更新域名的AAAA记录。

## 使用方法

```bash
# 安装wrangler
npm install -g @cloudflare/wrangler

# 登录CF
npx wrangler login

# 配置wrangler.toml
# 1. 修改zone_id为你的zone_id
npx wrangler secret put ZONE_ID
# 2. 修改zone_api_key为你的zone_api_key
npx wrangler secret put ZONE_API_KEY
# 3. 修改DDNS_PASSWORD为你的密码
npx wrangler secret put DDNS_PASSWORD

# 部署
npx wrangler deploy

# 访问 https://ddns.yourdomain.com/update?pwd=DDNS_PASSWORD&name=yourhostname&ipv6=yourip
```