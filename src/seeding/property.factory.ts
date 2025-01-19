import { faker } from '@faker-js/faker'; // Import the singleton faker instance
import { Property } from '../entities/property.entity';
import { setSeederFactory } from 'typeorm-extension';

export const PropertyFactory = setSeederFactory(Property, (faker) => {
  const property = new Property();
  property.name = faker.location.street();  // Correct usage of faker methods
  property.price = +faker.commerce.price({ min: 10000, max: 10000000 });
  property.description = faker.lorem.sentence();
  return property;
});
