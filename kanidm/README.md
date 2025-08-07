Bootstrap a local OAuth server (kanidm).

1. Create and start the container `docker compose up -d`

2. Import data from backup `./restore.sh`

3. Start the container again `docker compose up -d`

Kanidm is now running at `https://localhost:8443`

The setup includes two users:

demo_user:7hQxJbNdkqNqLd

demo_user2:BCVVfNdkxq86wP

Admin account: This account is used via the `kanidm` CLI tool

idm_admin:SU0q3hHwwwc48xK0ddS4Lyvq2XbGRLNY7z7BCVVf86wPv8Kc
