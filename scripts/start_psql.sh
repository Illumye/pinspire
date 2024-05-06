set -xe
/usr/lib/postgresql/15/bin/pg_ctl -D /tmp/$LOGNAME/ -l /tmp/$LOGNAME/startup.log start
