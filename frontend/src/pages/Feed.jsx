import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { LeftSidebar, RightSidebar } from '../components/FeedSidebars';
import { api } from '../api/client';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    try { setPosts(await api.getPosts()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLoveToggle = async (postId) => {
    try {
      const result = await api.toggleLove(postId);
      setPosts((prev) => prev.map((p) =>
        p.post_id === postId ? { ...p, loved_by_me: result.loved, love_count: result.love_count } : p
      ));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="animate-fade-in">
      {/* 3-column layout — sidebars hidden on mobile */}
      <div className="flex gap-6">

        {/* Left sidebar */}
        <div className="hidden lg:block w-56 shrink-0">
          <LeftSidebar />
        </div>

        {/* Center — main feed */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Feed</h1>
              <p className="text-sm mt-0.5" style={{ color: '#A0A4AE' }}>See what everyone is watching</p>
            </div>
            {!isAdmin && (
              <Link to="/feed/new" className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Post
              </Link>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-14 rounded-xl shrink-0" style={{ aspectRatio: '2/3', background: '#22252D' }} />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="w-20 h-2.5 rounded" style={{ background: '#22252D' }} />
                      <div className="w-3/4 h-3.5 rounded" style={{ background: '#22252D' }} />
                      <div className="w-full h-2.5 rounded" style={{ background: '#22252D' }} />
                      <div className="w-2/3 h-2.5 rounded" style={{ background: '#22252D' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(229,9,20,0.1)' }}>
                <svg className="w-6 h-6" style={{ color: '#E50914' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-1">No posts yet</h3>
              <p className="text-sm mb-5" style={{ color: '#A0A4AE' }}>Be the first one to share something</p>
              <Link to="/feed/new" className="btn-primary">Create a post</Link>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard key={post.post_id} post={post} onLoveToggle={handleLoveToggle}
                onDeleted={(postId) => setPosts((prev) => prev.filter(p => p.post_id !== postId))} />
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden xl:block w-56 shrink-0">
          <RightSidebar posts={posts} />
        </div>

      </div>
    </div>
  );
}
