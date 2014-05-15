JSFILES  = $(wildcard bin/ob lib/*.js test/*.js examples/*.js package.json)
MOCHA    = ./node_modules/.bin/_mocha
ISTANBUL = ./node_modules/.bin/istanbul
JSHINT   = ./node_modules/.bin/jshint
DOCKER   = ./node_modules/.bin/docker

test:
	@$(MOCHA)

cover:
	$(ISTANBUL) cover $(MOCHA) -- --ui bdd -R spec -t 5000

coverx:
	$(ISTANBUL) cover $(MOCHA) -- --ui bdd -R spec -t 5000 -g $(COVER)

lint:
	@$(JSHINT) $(JSFILES)

beautify:
	@js-beautify -r $(JSFILES)

docs:
	@$(DOCKER) -i lib -o docs

docclean:
	@rm -rf docs

readme:
	@pandoc -o index.html -s README.md

.PHONY: test cover coverx lint beautify docs docclean readme
