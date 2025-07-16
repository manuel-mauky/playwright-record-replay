#!/bin/sh

docker stop kanidmd

docker run --rm -i -t -v ./data:/data -v ./backup:/backup docker.io/kanidm/server:1.6.4 /sbin/kanidmd database restore /backup/kanidm.backup.json
