# Suggested Features for PHP Constructor

## 1. PHP 8.0+ Constructor Promotion

PHP 8.0 introduced [constructor property promotion](https://www.php.net/manual/en/language.oop5.declass.php#language.oop5.declass.constructor.promotion), which allows declaring and initializing properties directly in the constructor signature:

```php
// Before (current behavior)
class User {
    protected $name;

    public function __construct($name)
    {
        $this->name = $name;
    }
}

// After (promoted syntax)
class User {
    public function __construct(
        protected string $name
    ) {}
}
```

**Implementation notes:**
- Add a new config option `phpConstructor.usePromotion` (default: `false`).
- When enabled, skip generating the separate property declaration and `$this->` assignment.
- Combine the visibility modifier and type hint directly in the constructor parameter list.
- This is the single most impactful feature, since constructor promotion is now standard practice in modern PHP.

---

## 2. Type Hint Support

The current extension generates untyped properties and parameters. PHP 7.4+ supports typed properties and PHP 7.0+ supports parameter type declarations.

```php
// Current output
protected $userRepository;

public function __construct($userRepository)

// Desired output
protected UserRepository $userRepository;

public function __construct(UserRepository $userRepository)
```

**Implementation notes:**
- Add a snippet placeholder for the type hint (e.g., `${2:type} \$${1:property}`).
- Allow the user to tab through: type first, then property name.
- Support nullable types (`?string`) as part of the snippet.
- Add a config option `phpConstructor.includeTypeHint` (default: `true`) to toggle this.

---

## 3. Readonly Properties (PHP 8.1+)

PHP 8.1 introduced `readonly` properties that can only be initialized once:

```php
class User {
    public function __construct(
        private readonly string $name
    ) {}
}
```

**Implementation notes:**
- Add a config option `phpConstructor.readonly` (default: `false`).
- When enabled, insert `readonly` between the visibility modifier and the type hint.
- Works well in combination with constructor promotion (Feature #1).

---

## 4. PHPDoc `@param` Generation

When adding a new constructor property, automatically add or update the `@param` tag in the constructor's docblock:

```php
/**
 * @param string $name
 * @param string $email   <-- auto-generated
 */
public function __construct($name, $email)
```

**Implementation notes:**
- Detect if a docblock already exists above the constructor (the extension already parses docblocks in `findConstructorRange`).
- Insert a new `@param` line before the closing `*/`.
- Use the property name and optionally the type hint to populate the tag.

---

## 5. Remove Constructor Property Command

A reverse operation: select a property and remove it from the constructor, its assignment, and its declaration.

**Implementation notes:**
- Register a new command `phpConstructor.remove`.
- Show a quick-pick list of current constructor properties.
- Remove the selected property's declaration, parameter, and `$this->` assignment.

---

## 6. Multi-line Constructor Formatting

When a constructor has many parameters, it should support multi-line formatting:

```php
public function __construct(
    protected string $name,
    protected string $email,
    protected int $age
) {
}
```

**Implementation notes:**
- Add a config option `phpConstructor.multilineThreshold` (default: `3`) -- the number of parameters at which to switch to multi-line formatting.
- Alternatively, a `phpConstructor.alwaysMultiline` boolean option.
- Reformat existing single-line constructors when a new property pushes it past the threshold.

---

## 7. Automated Test Suite

The project has a VS Code launch configuration for tests (`Extension Tests` in `.vscode/launch.json`) but no actual test files exist. Adding tests would improve reliability and make contributions safer.

**Implementation notes:**
- Use the `@vscode/test-electron` package to run integration tests.
- Create a `test/` directory with test fixtures (sample PHP files) and test cases.
- Key scenarios to cover:
  - Insert constructor into an empty class.
  - Insert constructor into a class with existing properties.
  - Add property to an existing constructor.
  - Add property to a constructor with a docblock.
  - Handle `final`, `abstract`, and `trait` declarations.
  - Respect indentation settings (tabs vs. spaces).

---

## 8. Support for Enum Constructors (PHP 8.1+)

PHP 8.1 backed enums can have constructors:

```php
enum Suit: string {
    case Hearts = 'H';

    public function __construct(
        private string $symbol
    ) {}
}
```

**Implementation notes:**
- Extend the class/trait regex to also detect `enum` declarations.
- The existing insertion logic should work with minimal changes.

---

## 9. Keybinding Configuration

The extension currently has no default keybinding. Adding one would improve discoverability and speed.

**Implementation notes:**
- Add a default keybinding in `package.json` under `contributes.keybindings`, e.g., `Ctrl+Shift+C` (or `Cmd+Shift+C` on macOS).
- Keep it configurable so users can remap it.

---

## 10. Context Menu Integration

Add "Insert Constructor Property" to the editor right-click context menu when editing PHP files.

**Implementation notes:**
- Add a `menus` contribution in `package.json` under `contributes.menus.editor/context`.
- Use a `when` clause to only show it for PHP files: `"when": "editorLangId == php"`.

---

## Priority Recommendation

| Priority | Feature | Rationale |
|----------|---------|-----------|
| High | Constructor Promotion (PHP 8.0+) | Most requested modern PHP feature |
| High | Type Hint Support | Essential for modern PHP development |
| High | Automated Test Suite | Enables safe development of all other features |
| Medium | Readonly Properties (PHP 8.1+) | Natural extension of promotion support |
| Medium | PHPDoc Generation | Common workflow need |
| Medium | Multi-line Constructor Formatting | Improves readability for complex classes |
| Low | Remove Constructor Property | Nice to have, reverse operation |
| Low | Enum Constructors | Niche but relevant for PHP 8.1+ |
| Low | Keybinding Configuration | Small quality-of-life improvement |
| Low | Context Menu Integration | Small quality-of-life improvement |
