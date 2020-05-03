LePoT: LePoT-engaged Pattern-oriented Transpiler
================================================
_never write code without a cup of earl grey_

## What is LePoT Exactly?

LePoT calls itself a "Pattern-oriented Transpiler". When development
is complete it will be able to convert source files written in LePoT
to source files of other programming languages.

## Usage

Run `./lepot` to open the LePoT REPL.

**Important!** You will need to __press enter twice__ to run the
code you type in a REPL.

Using `./lepot file.lepot` will run the code in `file.lepot`,
or you can enter `!COPY file.lepot` from the REPL.

### Hello, World!
```
(logger.info 'Hello, World!')
```

The standard output stream is a basic fact of moden programming
languages, so why should you need to import something or type a
long package path? In generated code, LePoT will do all this work
for you.

### Basic usage

#### Variables
Defining some variables
```
: a 'I am a string'
: b ['I am a list item' 'I am another list item']
: c {'key1': "value1", 'key2': "value2"}
: d {'key1' 'value2' 'key2' 'value2'}
= a 'I have changed'
```

Notes:
- double-quoted and single-quoted strings are treated the same
- map definitions for `c` and `d` are equivalent; colons and
  commas are optional, but `{'k1' 'v1' : 'k2' 'v2'}` will induce
  a syntax error.
- lists are not comma-separated
- `:` will define a new variable, and `=` will change an existing
  variable. When using `:`, variable type is assumed by the value.

WIP:
- Types aren't actually checked yet, but the LePoT interpreter
  will be strongly-typed when it is complete. For now, assigning
  an incompatible type to a variable has undefined behaviour.
- Though basic escapes work for strings (`\' \t \n`), unicode
  escapes are not supported yet.
- The string encoding of LePoT is intended to be UTF-8.

#### Functions and the LePoT Registry
```
put function MyFunc { a [string] } [
  (logger.info
    (string.cat 'Hello, ' (a) '!')
  )
]

(MyFunc 'World')
```

LePoT has a registry (the LePoT Registry) which behaves like a map
of key-value pairs. The global function `put` adds items to this
registry.

The format expected for put looks like this:
```
put <pattern> <subject> [<arg1> <arg2> ...]
```

`MyFunc` is just a name - we can do multiple `put`s with this name
as long as the pattern is different. So instead of saying
"we defined a function called MyFunc", one would say
"we defined the function for MyFunc".

#### If
```
: a 1
: b 2
: c 1
if (== (a) (b)) [
  logger.info 'a is equal to b'
]
or (== (a) (c)) [
  logger.info 'a is equal to c'
]
or [
  logger.info 'a is neither equal to b nor c'
]
```

Notes:
- LePoT does not have infix operators by design; everything is a
  function. In this example `==`, `if`, and `:` are all functions.
- `or` is a pseudo-argument of `of` that extends its pattern
- hardly any of this will make sense until you read the next
  section on patterns.

#### Patterns

Patterns are a way to define structures of data that matter in your
program. There are patterns for `if`, `:`, `function` and even
`pattern`.

Suppose you wrote this function from a previous example:
```
put function MyFunc { a [string] } [
  (logger.info (string.cat 'Hello, ' (a) '!'))
]
```

To call the function, you would add:
```
(MyFunc 'World')
```

However, if `if` and `:` are functions, why don't they need
brackets? This is because there is a pattern defined for these.

We define patterns by doing a `put` with the special pattern
named `pattern`. The `pattern` for MyFunc would look like this:

```
put pattern MyFunc [
  [string]
]
```

This is the pattern for `if`:

```
put pattern if [
  // This matches the condition. The condition can be in both
  // code and list format, i.e. `(== (a) (b))` and `[== (a) (b)]`
  // are both accepted
  [ either [[code]] [[list]] ]

  // This matches the body; a list of function calls
  [list [code]]

  // The if function has a recursive pattern that can be continued
  // by adding the `or` keyword
  [ optional
    [ keyword or ]
    [ either [[if]] [[list]] ]
  ]
]
```
