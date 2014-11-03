install: ansible-galaxy vagrant

ansible-galaxy:
		ansible-galaxy install -r requirements.txt -f

vagrant:
		vagrant up
