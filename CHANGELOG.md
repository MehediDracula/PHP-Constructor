# Change Log
All notable changes to the "php-constructor" extension will be documented in this file.

## [0.1.2]
- Fix constructor is always using property visibility; fix [#9](https://github.com/MehediDracula/PHP-Constructor/issues/9)

## [0.1.1]
- Improve extension settings [#7](https://github.com/MehediDracula/PHP-Constructor/issues/7)

## [0.1.0]
- Adapt indentation from vscode settings [#5](https://github.com/MehediDracula/PHP-Constructor/issues/5)

## [0.0.10]
- Add config for choosing property visibility
- Add config for choosing constructor visibility
- Remove `constructor_visibility` config
- Detect class constants

## [0.0.9]
- Add support for trait

## [0.0.8]
- Don't insert constructor if class declaration is not found

## [0.0.7]
- Fix [#4](https://github.com/MehediDracula/PHP-Constructor/issues/4)

## [0.0.6]
- Fix property is not initializing if constructor has no argument
- Add new configuration for constructor visibility
- Fix constructor insertion when matching with properties having a multiline declaration as last properties. (#1)

## [0.0.4]
- Fix new line is not adding properly

## [0.0.3]
- Don't run command if no file is opened

## [0.0.2]
- Append and prepend proper new line while inserting snippet

## [0.0.1]
- Initial release
