#!/bin/bash

docker build -t newssocial/mongodb ./mongo

docker run -d -p 27017:27017 --name ns-mongodb newssocial/mongodb
