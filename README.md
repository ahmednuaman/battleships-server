# Battleships Server

A simple battleships server written in NodeJS and MongoDB

[![Build Status](https://travis-ci.org/ahmednuaman/battleships-server.svg?branch=master)](https://travis-ci.org/ahmednuaman/battleships-server) [![Code Climate](https://codeclimate.com/github/ahmednuaman/battleships-server/badges/gpa.svg)](https://codeclimate.com/github/ahmednuaman/battleships-server) [![Code Climate](https://codeclimate.com/github/ahmednuaman/battleships-server/badges/gpa.svg)](https://codeclimate.com/github/ahmednuaman/battleships-server)

## How to set up
1. Download and install [Vagrant](https://www.vagrantup.com/) and [Ansible](http://www.ansible.com/home)
2. Clone this repo, open your terminal and `cd` into it
3. Run `make install`
4. Make some tea
5. Log in using `vagrant ssh`
6. Confirm that mongodb is running using `service mongod status` (if it's not, run `sudo service mongod start`)
