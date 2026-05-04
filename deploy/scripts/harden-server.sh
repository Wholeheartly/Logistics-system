#!/bin/bash
set -euo pipefail

echo "========================================="
echo "  Server Security Hardening"
echo "========================================="

echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y

echo "[2/8] Installing security utilities..."
apt-get install -y ufw fail2ban unattended-upgrades auditd

echo "[3/8] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "UFW status:"
ufw status

echo "[4/8] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo "[5/8] Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "[6/8] Hardening SSH..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowTcpForwarding no
EOF

echo "[7/8] Setting kernel security parameters..."
cat > /etc/sysctl.d/99-security.conf << 'EOF'
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
fs.protected_regular = 1
fs.protected_fifos = 1
fs.protected_symlinks = 1
fs.protected_hardlinks = 1
EOF

sysctl --system

echo "[8/8] Setting file permissions..."
chmod 700 /root
chmod 600 /etc/ssh/sshd_config

echo ""
echo "========================================="
echo "  Security Hardening Complete!"
echo "========================================="
echo ""
echo "IMPORTANT: Before restarting SSH, ensure you have:"
echo "  1. Added your SSH public key to ~/.ssh/authorized_keys"
echo "  2. Tested SSH key login works"
echo "  3. Then restart SSH: systemctl restart sshd"
echo ""
