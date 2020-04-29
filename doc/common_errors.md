# Format of this document

- **heading 2:** an error message observed
- **heading 3:** a possible cause for the error
  - **Error observed:** more specific variant of the error message
  - **Cause:** specific cause of error; if omitted, use heading 3 title
  - **Solution:** explanation on how to resolve the error

# Contents

## `TypeError: Cannot read property 'type' of undefined`

### No return value in LePoT function

Error observed:
```
    if ( res.type === 'exit' ) api.stop(res);

TypeError: Cannot read property 'type' of undefined
```

Solution:
- LePoT functions must return a `descriptiveresult` value; for example:
  ```
  return dres.resOK();
  ```
