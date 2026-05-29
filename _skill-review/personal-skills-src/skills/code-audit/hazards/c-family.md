# C / C++ / C# hazards

Load when auditing `.c`, `.cpp`, `.h`, `.hpp`, `.cs` files. Lower priority than GDScript per Nick. C# only appears in HBH/BR as fallback for Godot per the GDScript-first rule.

## Parse / syntax (BLOCK)

### Missing semicolon at end of struct/class declaration

```cpp
// BAD
struct Foo {
    int x;
}  // missing ;

void next_function() { ... }  // parse cascade from here
```

### Uninitialized POD members

```cpp
// BAD - garbage value at construction
struct Vec3 { float x, y, z; };
Vec3 v;  // x, y, z are uninitialized
```

Fix: zero-init via brace `Vec3 v{};` or `Vec3 v = {0, 0, 0};`.

### Header without include guard

Every `.h`/`.hpp` should have `#pragma once` (preferred) or `#ifndef/#define/#endif`. Missing guards cause multiple-definition link errors when the header is included transitively.

## Logic smells (MEDIUM)

### `if (a = b)` instead of `if (a == b)`

Assignment in a condition is a common typo. Most compilers warn with `-Wparentheses`; if you suppress that, the bug returns.

Fix: enable `-Wall -Wextra` or write `if ((a = b))` if assignment-as-condition is intentional.

### `delete` without `nullptr` reset

```cpp
delete ptr;
// ptr still holds the now-invalid address; double-delete later crashes
```

Fix: `delete ptr; ptr = nullptr;` or use `std::unique_ptr`.

### memcpy on non-POD types

memcpy bypasses the constructor. For types with virtual functions, dynamic allocations, or non-trivial copy semantics, this corrupts state silently.

### switch without `default:`

Easy to forget when adding a new enum value. Either add `default:` or annotate the enum as exhaustive and rely on compiler warnings.

## C# / .NET (HBH fallback only)

GDScript is the primary language per the HBH CLAUDE.md "C# is fallback only". If C# appears in source/, flag and ask whether the GDScript path was attempted first.

### Async void

```csharp
// BAD - async void swallows exceptions; can't be awaited
public async void DoThing() { ... }
```

Fix: return `Task` (or `Task<T>`) instead of `void`. Reserve async void for event handlers only.

### IDisposable not in using

Any type implementing IDisposable should be in a `using` block (or `using` declaration in C# 8+). Otherwise the resource leak is silent.

## Style (LOW)

### snake_case in C#

C# convention is PascalCase for methods/properties, camelCase for parameters/locals. snake_case is a sign someone wrote the file in a different language and ported.
