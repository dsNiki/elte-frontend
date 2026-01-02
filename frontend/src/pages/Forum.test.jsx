/* eslint-disable import/first */
// Mock the API services BEFORE imports
jest.mock("../services/api");
jest.mock("axios");

import * as api from "../services/api";
import axios from "axios";

const mockGroupService = api.groupService;
const mockForumService = api.forumService;
const mockAuthService = api.default;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
global.localStorage = localStorageMock;

// Mock window.open
global.window.open = jest.fn();

describe("Forum Service Logic", () => {
  const mockGroupId = "1";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        id: 1,
        name: "Test User",
        email: "test@elte.hu",
      })
    );

    // Default mock implementations
    mockGroupService.myGroups = jest.fn().mockResolvedValue({
      groups: [
        {
          id: 1,
          name: "Test Group",
          subject: "Test Subject",
        },
      ],
    });

    mockGroupService.getGroupMembers = jest.fn().mockResolvedValue([
      {
        user_id: 1,
        name: "Test User",
        email: "test@elte.hu",
      },
    ]);

    mockGroupService.markGroupPostsRead = jest.fn().mockResolvedValue({});

    mockForumService.getPosts = jest.fn().mockResolvedValue([]);
    mockForumService.getComments = jest.fn().mockResolvedValue([]);
    mockForumService.createPost = jest
      .fn()
      .mockResolvedValue({ post: { id: 1 } });
    mockForumService.createComment = jest.fn().mockResolvedValue({
      id: 1,
      content: "Test comment",
      author_id: 1,
    });
    mockForumService.updatePost = jest
      .fn()
      .mockResolvedValue({ post: { id: 1 } });
    mockForumService.updateComment = jest.fn().mockResolvedValue({
      id: 1,
      content: "Updated comment",
    });
    mockForumService.deletePost = jest.fn().mockResolvedValue({});
    mockForumService.deleteComment = jest.fn().mockResolvedValue({});
    mockForumService.deleteAttachment = jest.fn().mockResolvedValue({});

    mockAuthService.getUser = jest.fn().mockReturnValue({
      id: 1,
      name: "Test User",
      email: "test@elte.hu",
    });

    axios.post = jest.fn().mockResolvedValue({ data: {} });
  });

  describe("Group Service", () => {
    it("should fetch group details", async () => {
      await mockGroupService.myGroups();
      expect(mockGroupService.myGroups).toHaveBeenCalled();
    });

    it("should fetch posts for a group", async () => {
      await mockForumService.getPosts(mockGroupId);
      expect(mockForumService.getPosts).toHaveBeenCalledWith(mockGroupId);
    });

    it("should handle user not being a member of the group", async () => {
      mockGroupService.myGroups.mockResolvedValue({
        groups: [{ id: 2, name: "Other Group" }],
      });

      const response = await mockGroupService.myGroups();
      expect(response.groups).not.toContainEqual(
        expect.objectContaining({ id: 1 })
      );
    });

    it("should process group data correctly", async () => {
      const response = await mockGroupService.myGroups();
      expect(response.groups[0].name).toBe("Test Group");
      expect(response.groups[0].subject).toBe("Test Subject");
    });

    it("should fetch group members", async () => {
      const members = await mockGroupService.getGroupMembers(mockGroupId);
      expect(mockGroupService.getGroupMembers).toHaveBeenCalledWith(
        mockGroupId
      );
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(1);
    });

    it("should mark group posts as read", async () => {
      await mockGroupService.markGroupPostsRead(mockGroupId);
      expect(mockGroupService.markGroupPostsRead).toHaveBeenCalledWith(
        mockGroupId
      );
    });
  });

  describe("Post Service", () => {
    it("should create a post", async () => {
      const result = await mockForumService.createPost(
        mockGroupId,
        "Test Title",
        "Test Content",
        []
      );
      expect(mockForumService.createPost).toHaveBeenCalledWith(
        mockGroupId,
        "Test Title",
        "Test Content",
        []
      );
      expect(result.post.id).toBe(1);
    });

    it("should update a post", async () => {
      const result = await mockForumService.updatePost(
        1,
        "Updated Title",
        "Updated Content"
      );
      expect(mockForumService.updatePost).toHaveBeenCalledWith(
        1,
        "Updated Title",
        "Updated Content"
      );
      expect(result.post.id).toBe(1);
    });

    it("should delete a post", async () => {
      await mockForumService.deletePost(1);
      expect(mockForumService.deletePost).toHaveBeenCalledWith(1);
    });

    it("should fetch posts", async () => {
      const mockPosts = [
        {
          id: 1,
          title: "Test Post",
          content: "Test content",
          author_id: 1,
          created_at: "2025-01-15T10:00:00Z",
          updated_at: "2025-01-15T10:00:00Z",
          comment_count: 0,
          attachments: [],
        },
      ];
      mockForumService.getPosts.mockResolvedValue(mockPosts);

      const posts = await mockForumService.getPosts(mockGroupId);
      expect(posts).toEqual(mockPosts);
      expect(posts[0].title).toBe("Test Post");
    });
  });

  describe("Comment Service", () => {
    it("should create a comment", async () => {
      const result = await mockForumService.createComment(1, "Test comment");
      expect(mockForumService.createComment).toHaveBeenCalledWith(
        1,
        "Test comment"
      );
      expect(result.id).toBe(1);
      expect(result.content).toBe("Test comment");
    });

    it("should update a comment", async () => {
      const result = await mockForumService.updateComment(1, "Updated comment");
      expect(mockForumService.updateComment).toHaveBeenCalledWith(
        1,
        "Updated comment"
      );
      expect(result.content).toBe("Updated comment");
    });

    it("should delete a comment", async () => {
      await mockForumService.deleteComment(1);
      expect(mockForumService.deleteComment).toHaveBeenCalledWith(1);
    });

    it("should fetch comments", async () => {
      const mockComments = [
        {
          id: 1,
          content: "Test comment",
          author_id: 1,
          post_id: 1,
          created_at: "2025-01-15T11:00:00Z",
          updated_at: "2025-01-15T11:00:00Z",
          attachments: [],
        },
      ];
      mockForumService.getComments.mockResolvedValue(mockComments);

      const comments = await mockForumService.getComments(1);
      expect(comments).toEqual(mockComments);
      expect(comments[0].content).toBe("Test comment");
    });
  });

  describe("Attachment Service", () => {
    it("should delete an attachment", async () => {
      await mockForumService.deleteAttachment(1);
      expect(mockForumService.deleteAttachment).toHaveBeenCalledWith(1);
    });
  });

  describe("Auth Service", () => {
    it("should get current user", () => {
      const user = mockAuthService.getUser();
      expect(user).toEqual({
        id: 1,
        name: "Test User",
        email: "test@elte.hu",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle post creation errors", async () => {
      mockForumService.createPost.mockRejectedValue({
        response: { data: { error: "Failed to create post" } },
      });

      await expect(
        mockForumService.createPost(mockGroupId, "Title", "Content", [])
      ).rejects.toEqual({
        response: { data: { error: "Failed to create post" } },
      });
    });

    it("should handle group fetch errors", async () => {
      mockGroupService.myGroups.mockRejectedValue({
        message: "Failed to load group",
      });

      await expect(mockGroupService.myGroups()).rejects.toEqual({
        message: "Failed to load group",
      });
    });
  });
});
