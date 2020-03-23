# FakeQL

Automatic GraphQL mocks

## Installation

### npm

```sh
npm install --save-dev fakeql
```

### yarn

```sh
yarn add --dev fakeql
```

## Usage

```javascript
import { fakeQL } from "./fakeql";
import { parse } from "graphql";

const document = parse(`
  query me {
    user {
      name
      age
      teams {
        name
        userCanAdminister
      }
    }
  }

  const fake = fakeQL({
    document
  })

  /*
    fake = {
      user: {
        name: 'mock-value-for-field-"name"',
        age: 'mock-value-for-field-"age"',
        teams: {
          name: 'mock-value-for-field-"name"',
          userCanAdminister: 'mock-value-for-field-"userCanAdminister"'
        }
      }
    }
  */
`);
```
