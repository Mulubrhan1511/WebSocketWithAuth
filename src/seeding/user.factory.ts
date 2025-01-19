import { faker } from '@faker-js/faker'; // Use the singleton `faker`
import { User } from '../entities/user.entity'; // Import your User entity
import { setSeederFactory } from 'typeorm-extension'; // Import setSeederFactory from typeorm-extension

export const UserFactory = setSeederFactory(User, (faker) => { // Use the singleton `faker`
  const user = new User();
  user.firstName = faker.person.firstName();
  user.lastName = faker.person.lastName();
  user.email = faker.internet.email();
  user.avatarUrl = faker.image.avatar();
  return user;
});
