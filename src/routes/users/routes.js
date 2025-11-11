// routes/users/routes.js
import { Hono } from 'hono';
import { getUsers } from './get.js';
import { createUser } from './create.js';
import { updateUser } from './update.js';
import { getUserById } from './id.js';
import { deleteUser } from './delete.js';

const usersRouter = new Hono();

usersRouter.get('/', getUsers);
usersRouter.post('/', createUser);
usersRouter.get('/:id', getUserById);
usersRouter.put('/:id', updateUser);
usersRouter.delete('/:id', deleteUser); // ✅ Add DELETE route

export default usersRouter;
