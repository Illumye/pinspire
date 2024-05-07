set -xe

echo "RAPPEL: LES SCRIPTS NE FONCTIONNENT QU'AU CREMI !!"

# Définir le host
export PGHOST=/tmp/$LOGNAME
# Définir le port
export PGPORT=$UID

# Initialiser les fichiers nécessaires à PSQL
/usr/lib/postgresql/15/bin/pg_ctl -D /tmp/$LOGNAME/ -l /tmp/$LOGNAME/startup.log initdb

# Changer la configuration de base pour que cela marche au CREMI
pg_conftool -v /tmp/$LOGNAME/postgresql.conf set unix_socket_directories /tmp/$LOGNAME/
