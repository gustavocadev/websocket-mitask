import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db/db';
import { task } from './db/schema';
import { eq } from 'drizzle-orm';

const findTasks = async () => db.select().from(task);

const app = new Elysia()
  .use(cors())
  .ws('/ws', {
    async open(ws) {
      ws.subscribe('task');
      const tasks = await findTasks();
      ws.send({
        type: 'get-tasks',
        payload: tasks,
      });
    },
    body: t.Object({
      type: t.String(),
      payload: t.Any(),
    }),
    async message(ws, message) {
      if (message.type === 'new-task') {
        const newTask = message.payload;
        await db.insert(task).values({
          name: newTask.name,
          deliveryDate: new Date(newTask.dueDate),
          description: newTask.description,
          priority: newTask.priority,
          projectId: newTask.projectId,
          state: false,
        });

        const tasks = await findTasks();
        app.server!.publish(
          'task',
          JSON.stringify({
            type: 'get-tasks',
            payload: tasks,
          })
        );
      }
      if (message.type === 'delete-task') {
        const taskId = message.payload.taskId;

        await db.delete(task).where(eq(task.id, taskId));
        const tasks = await findTasks();
        app.server!.publish(
          'task',
          JSON.stringify({
            type: 'get-tasks',
            payload: tasks,
          })
        );
      }

      if (message.type === 'update-task-state') {
        const taskId = message.payload.taskId;
        const userId = message.payload.userId;
        const taskState = Number(message.payload.taskState);

        await db
          .update(task)
          .set({
            state: taskState ? true : false,
            userWhoCompletedTaskId: taskState ? userId : null,
          })
          .where(eq(task.id, taskId));

        const tasks = await findTasks();
        app.server!.publish(
          'task',
          JSON.stringify({
            type: 'get-tasks',
            payload: tasks,
          })
        );
      }
    },
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
