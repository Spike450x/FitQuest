# /code-audit

Perform a code quality audit of the file, component, or area described in `$ARGUMENTS`.

Review for:

1. **Pattern consistency** — does this follow the same conventions as the rest of the codebase?
2. **Duplication** — is there logic that should be abstracted into a shared hook or utility?
3. **TypeScript correctness** — imprecise types, `any` escapes, missing generics
4. **React best practices** — unnecessary re-renders, hook dependency arrays, key props
5. **Zustand usage** — store access and mutations following established patterns?
6. **Firebase layer** — reads/writes going through `src/lib/` utilities, not inline in components?
7. **Next.js App Router** — correct use of server vs client components?
8. **Performance** — expensive unmemorized computations, large imports, N+1 reads?

Classify findings as:

- **Must Fix** — correctness or security issue
- **Should Fix** — code quality or maintainability
- **Consider** — improvement opportunity

End with **Next-Level Suggestions** and **Potential Risks / Gaps**.

If no specific file is given, audit the most recently modified files.
