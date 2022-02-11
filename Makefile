
build-parser:
	jison src/firestoreQueryParser.jison -m js -o src/firestoreQueryParser.js

dist: build-parser
	rm -rf dist
	mkdir -p dist
	cat src/firestoreQueryParser.js src/firestoreQueryUtil.js > dist/firestoreQueryParser.js
	uglifyjs dist/firestoreQueryParser.js -o dist/firestoreQueryParser.min.js
	rm dist/firestoreQueryParser.js
