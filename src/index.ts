import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db/db';
import { task } from './db/schema';
import { eq } from 'drizzle-orm';

const findTasksByProjectId = async (projectId: string) => {
  return db.select().from(task).where(eq(task.projectId, projectId));
};

const publishTasks = async (projectId: string) => {
  try {
    const tasks = await findTasksByProjectId(projectId);
    app.server!.publish(
      'task',
      JSON.stringify({
        type: 'get-tasks',
        payload: tasks,
      })
    );
  } catch (error) {
    console.log(error);
  }
};

// todo: I need to type the payload
const app = new Elysia()
  .use(cors())
  .ws('/ws', {
    async open(ws) {
      ws.subscribe('task');
    },
    body: t.Object({
      type: t.String(),
      payload: t.Any(),
    }),
    async message(ws, message) {
      if (message.type === 'get-tasks') {
        console.log(message.payload.projectId);
        await publishTasks(message.payload.projectId);
      }

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

        await publishTasks(newTask.projectId);
      }
      if (message.type === 'delete-task') {
        const taskId = message.payload.taskId;
        const projectId = message.payload.projectId;

        await db.delete(task).where(eq(task.id, taskId));

        await publishTasks(projectId);
      }

      if (message.type === 'update-task-state') {
        const taskId = message.payload.taskId;
        const userId = message.payload.userId;
        const taskState = Number(message.payload.taskState);
        const projectId = message.payload.projectId;

        await db
          .update(task)
          .set({
            state: taskState ? true : false,
            userWhoCompletedTaskId: taskState ? userId : null,
          })
          .where(eq(task.id, taskId));

        await publishTasks(projectId);
      }

      if (message.type === 'update-task') {
        const taskId = message.payload.taskId;
        const newTask = message.payload.newTask;
        const projectId = message.payload.projectId;

        await db
          .update(task)
          .set({
            name: newTask.name,
            deliveryDate: new Date(newTask.deliveryDate),
            description: newTask.description,
            priority: newTask.priority,
          })
          .where(eq(task.id, taskId));

        await publishTasks(projectId);
      }
    },
  })
  .listen(Bun.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
