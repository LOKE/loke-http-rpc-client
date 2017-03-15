import test from 'ava';
import httpRpcClient from '../';
import mockService from './helpers/mock-service';

test.only('call ping', async t => {
  const {end, address} = await mockService.create();

  const client = httpRpcClient.load(address, 'test-service');

  const result = await client.ping()

  t.is(result, 'pong');
});
