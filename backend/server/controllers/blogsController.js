import { asyncHandler } from '../utils/errors.js'
import {
  addBlogComment,
  createBlog,
  createBlogCategory,
  deleteBlog,
  deleteBlogComment,
  getBlogById,
  listBlogCategories,
  listBlogComments,
  listBlogs,
  listBlogsByUserEmail,
  updateBlog,
  updateBlogComment,
} from '../services/blogsService.js'

export const getBlogs = asyncHandler(async (_request, response) => {
  response.json(await listBlogs())
})

export const getBlog = asyncHandler(async (request, response) => {
  response.json(await getBlogById(request.params.id))
})

export const getUserBlogs = asyncHandler(async (request, response) => {
  response.json(await listBlogsByUserEmail(request.params.email))
})

export const create = asyncHandler(async (request, response) => {
  response.status(201).json(await createBlog(request.body ?? {}))
})

export const update = asyncHandler(async (request, response) => {
  response.json(await updateBlog(request.params.id, request.body ?? {}))
})

export const remove = asyncHandler(async (request, response) => {
  response.json(await deleteBlog(request.params.id))
})

export const getCategories = asyncHandler(async (_request, response) => {
  response.json(await listBlogCategories())
})

export const createCategory = asyncHandler(async (request, response) => {
  response.status(201).json(await createBlogCategory(request.body ?? {}))
})

export const getComments = asyncHandler(async (request, response) => {
  response.json(await listBlogComments(request.params.id))
})

export const createComment = asyncHandler(async (request, response) => {
  response.status(201).json(await addBlogComment(request.params.id, request.body ?? {}))
})

export const updateComment = asyncHandler(async (request, response) => {
  response.json(await updateBlogComment(request.params.commentId, request.body ?? {}))
})

export const removeComment = asyncHandler(async (request, response) => {
  response.json(await deleteBlogComment(request.params.commentId, request.body ?? {}))
})
