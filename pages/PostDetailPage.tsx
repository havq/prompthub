import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePostDetail } from '../hooks/usePostDetail';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import SocialIcon from '../components/SocialIcon';
import { RightSidebar } from '../components/RightSidebar';
import ShareButton from '../components/ShareButton';
import { buildUrl } from '../utils/permalinks';
import { sanitizeHtml } from '../utils/sanitize';
import { formatCount } from '../utils/formatters';
import PostCommentItem from '../components/post/PostCommentItem';
import RelatedPostsSection from '../components/post/RelatedPostsSection';
import MentionInput from '../components/MentionInput';

export const PostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const { t } = useLanguage();
    
    const {
        post, categories, comments, isLoading, error, authorProfile, relatedPosts,
        newComment, setNewComment, isPosting, commentError, countdown,
        replyingTo, setReplyingTo, deletingComment, setDeletingComment, isDeleting,
        currentUser, userProfile, isAdmin, allUsers,
        handlePostComment, handleDeleteComment, fetchComments,
        COMMENTS_PER_PAGE, commentsGloballyEnabled
    } = usePostDetail(postId);

    const [currentPage, setCurrentPage] = useState(1);
    const canEdit = isAdmin || (currentUser && post && post.authorId === currentUser.uid);
    const postCommentsEnabled = post?.commentsEnabled ?? true;
    const canCommentOnPost = commentsGloballyEnabled && postCommentsEnabled;

    const paginatedComments = useMemo(() => {
        const sorted = [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
        return sorted.slice(startIndex, startIndex + COMMENTS_PER_PAGE);
    }, [comments, currentPage, COMMENTS_PER_PAGE]);
    
    const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);

    if (isLoading) return <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
    if (!post) return <div className="text-center py-20">Post not found.</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <main className="lg:col-span-9">
                {deletingComment && <ConfirmModal isOpen={!!deletingComment} onClose={() => setDeletingComment(null)} onConfirm={handleDeleteComment} title="Delete Comment" message="Are you sure you want to delete this comment and all its replies?" confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isDeleting} />}
                <div className="mb-6"><Link to="/posts" className="text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Back to Posts</Link></div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden -mx-4 md:-mx-0">
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-auto object-cover max-h-96" />}
                    <article className="p-4 md:p-6 lg:p-8">
                         <div className="flex items-start gap-4 mb-4">
                            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex-grow">{post.title}</h1>
                            {post.status === 'private' && (
                                <span className="inline-flex items-center gap-x-1.5 rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">Private</span>
                            )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-6 text-sm text-gray-500 dark:text-gray-400">
                            {post.authorId && post.authorName && (
                                <Link to={buildUrl('author', { authorId: post.authorId })} className="flex items-center gap-2 hover:underline">
                                    <img src={post.authorPhotoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`} alt={post.authorName} className="w-8 h-8 rounded-full"/>
                                    <span className="font-semibold">{post.authorName}</span>
                                </Link>
                            )}
                            <span>&bull;</span>
                            <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time>
                            <span>&bull;</span>
                            <div className="flex items-center gap-1" title="Views"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><span>{formatCount(post.viewCount)}</span></div>
                            <div className="flex items-center gap-1" title="Comments"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span>{formatCount(post.commentCount)}</span></div>
                            <span>&bull;</span>
                            <ShareButton post={post} shareText={post.title} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg><span className="font-medium">{t('common.share')}</span>
                            </ShareButton>
                            {canEdit && (
                                <><span>&bull;</span><Link to={`/edit-post/${post.id}`} className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>{t('common.edit')}</Link></>
                            )}
                        </div>

                        <div className="prose prose-lg dark:prose-invert max-w-none prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-headings:font-bold prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-ul:list-disc prose-ul:marker:text-indigo-500" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />

                        {post.tags && post.tags.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-wrap gap-2">
                                    {post.tags.map(tag => <span key={tag} className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">#{tag}</span>)}
                                </div>
                            </div>
                        )}

                        {authorProfile && (
                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-start gap-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
                                <Link to={buildUrl('author', { authorId: authorProfile.uid })} className="flex-shrink-0"><img src={authorProfile.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(authorProfile.username)}`} alt={authorProfile.username} className="w-20 h-20 rounded-full"/></Link>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">About the author</p>
                                    <h3 className="text-xl font-bold mt-1"><Link to={buildUrl('author', { authorId: authorProfile.uid })} className="hover:underline">{authorProfile.username}</Link></h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{authorProfile.bio}</p>
                                    {authorProfile.socialLinks && authorProfile.socialLinks.length > 0 && (
                                        <div className="flex items-center flex-wrap gap-4 mt-3">{authorProfile.socialLinks.map((link, index) => <SocialIcon key={index} platform={link.platform} url={link.url} />)}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </article>

                    <RelatedPostsSection relatedPosts={relatedPosts} />

                    <section className="p-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
                        <div className="space-y-6">
                            {canCommentOnPost ? (
                                currentUser && userProfile ? (
                                    <form onSubmit={(e) => { e.preventDefault(); handlePostComment(newComment, null); }} className="flex items-start space-x-4">
                                        <img src={userProfile.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} alt="Your avatar" className="h-10 w-10 rounded-full"/>
                                        <div className="flex-1">
                                            <MentionInput 
                                                value={newComment} 
                                                onChange={(val) => { setNewComment(val); }} 
                                                users={allUsers} 
                                                placeholder="Add a comment..." 
                                                className="block w-full p-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-700 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none"
                                            />
                                            {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
                                            {countdown > 0 && <p className="text-xs text-orange-500 mt-1">Please wait {countdown}s to post again.</p>}
                                            <div className="mt-2 flex justify-end">
                                                <button type="submit" disabled={isPosting || !newComment.trim() || countdown > 0} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 w-28 flex justify-center">{isPosting ? <Spinner size="sm"/> : 'Post'}</button>
                                            </div>
                                        </div>
                                    </form>
                                ) : (<p className="text-center text-sm text-gray-500 dark:text-gray-400">Please <Link to="/login" className="text-indigo-500 hover:underline">log in</Link> to comment.</p>)
                            ) : (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t(!commentsGloballyEnabled ? 'promptDetail.commentsDisabledGlobal' : 'postDetail.commentsDisabled')}</p>
                            )}
                            
                            {paginatedComments.length > 0 ? (
                                <ul className="space-y-6">
                                    {paginatedComments.map(comment => (
                                        <PostCommentItem 
                                            key={comment.id} 
                                            comment={comment} 
                                            onStartDelete={setDeletingComment} 
                                            onRefresh={fetchComments} 
                                            replyingTo={replyingTo} 
                                            onReplyClick={setReplyingTo} 
                                            onPostReply={handlePostComment} 
                                            canComment={canCommentOnPost}
                                            allUsers={allUsers}
                                        />
                                    ))}
                                </ul>
                            ) : ( canCommentOnPost && <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-8">Be the first to comment!</p>)}

                            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                        </div>
                    </section>
                </div>
            </main>
            <div className="hidden lg:block lg:col-span-3">
                <RightSidebar categories={categories} />
            </div>
        </div>
    );
};

export default PostDetailPage;