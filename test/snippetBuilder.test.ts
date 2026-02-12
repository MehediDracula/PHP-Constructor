import { describe, it, expect } from "vitest";
import { Visibility } from "../src/types";
import {
  buildVisibilityChoice,
  buildVisibilitySnippet,
  buildNewConstructorSnippet,
  buildPropertyDeclarationSnippet,
  escapeSnippetDollars,
} from "../src/snippetBuilder";

describe("buildVisibilityChoice", () => {
  it("places the default value first", () => {
    expect(buildVisibilityChoice(Visibility.Protected)).toBe("protected,public,private");
  });

  it("works with public as default", () => {
    expect(buildVisibilityChoice(Visibility.Public)).toBe("public,protected,private");
  });

  it("works with private as default", () => {
    expect(buildVisibilityChoice(Visibility.Private)).toBe("private,public,protected");
  });
});

describe("buildVisibilitySnippet", () => {
  it("returns literal visibility when choice is disabled", () => {
    const config = {
      visibility: Visibility.Protected,
      constructorVisibility: Visibility.Public,
      choosePropertyVisibility: false,
      chooseConstructorVisibility: false,
    };

    expect(buildVisibilitySnippet(config, 2, "property")).toBe("protected");
    expect(buildVisibilitySnippet(config, 3, "constructor")).toBe("public");
  });

  it("returns snippet choice when choice is enabled for property", () => {
    const config = {
      visibility: Visibility.Protected,
      constructorVisibility: Visibility.Public,
      choosePropertyVisibility: true,
      chooseConstructorVisibility: false,
    };

    expect(buildVisibilitySnippet(config, 2, "property")).toBe(
      "${2|protected,public,private|}",
    );
  });

  it("returns snippet choice when choice is enabled for constructor", () => {
    const config = {
      visibility: Visibility.Protected,
      constructorVisibility: Visibility.Public,
      choosePropertyVisibility: false,
      chooseConstructorVisibility: true,
    };

    expect(buildVisibilitySnippet(config, 3, "constructor")).toBe(
      "${3|public,protected,private|}",
    );
  });
});

describe("buildNewConstructorSnippet", () => {
  it("builds a complete constructor snippet", () => {
    const config = {
      visibility: Visibility.Protected,
      constructorVisibility: Visibility.Public,
      choosePropertyVisibility: false,
      chooseConstructorVisibility: false,
    };

    const result = buildNewConstructorSnippet(config, "    ", "        ");

    expect(result).toContain("protected \\$${1:property};");
    expect(result).toContain("public function __construct(\\$${1:property})");
    expect(result).toContain("\\$this->${1:property} = \\$${1:property};$0");
  });

  it("includes snippet choices when enabled", () => {
    const config = {
      visibility: Visibility.Private,
      constructorVisibility: Visibility.Protected,
      choosePropertyVisibility: true,
      chooseConstructorVisibility: true,
    };

    const result = buildNewConstructorSnippet(config, "    ", "        ");

    expect(result).toContain("${2|private,public,protected|}");
    expect(result).toContain("${3|protected,public,private|}");
  });
});

describe("buildPropertyDeclarationSnippet", () => {
  it("builds a property declaration with trailing newlines", () => {
    const config = {
      visibility: Visibility.Protected,
      constructorVisibility: Visibility.Public,
      choosePropertyVisibility: false,
      chooseConstructorVisibility: false,
    };

    const result = buildPropertyDeclarationSnippet(config, "    ");

    expect(result).toBe("    protected \\$${1:property};\n\n");
  });
});

describe("escapeSnippetDollars", () => {
  it("escapes dollar signs", () => {
    expect(escapeSnippetDollars("$this->foo = $foo")).toBe("\\$this->foo = \\$foo");
  });

  it("returns empty string unchanged", () => {
    expect(escapeSnippetDollars("")).toBe("");
  });

  it("returns string without dollars unchanged", () => {
    expect(escapeSnippetDollars("no dollars here")).toBe("no dollars here");
  });
});
