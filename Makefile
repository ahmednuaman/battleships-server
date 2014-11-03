install: ansible-galaxy vagrant-up

ansible-galaxy:
		ansible-galaxy install -r requirements.txt -f

vagrant-up:
		vagrant up
