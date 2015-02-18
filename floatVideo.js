$(document).ready(function() {
    // Handle dragging.
    var floated = false;
    var originalHeight;
    var originalWidth;
    var miniScreenLastTop;
    var miniScreenLastLeft;
    var miniScreenLastHeight;
    var miniScreenLastWidth;
    var start;
    var longpress = 100;
    var dragStartX, dragStartY, dragStartWidth, dragStartHeight, dragRatio;
    var maxWidth = 640;
    var minWidth = 310;
    var resizing = false;

    // Bind the time update event to the video
    $('.video-stream').bind('timeupdate', updateTime);

    (function($) {
        $.fn.drags = function(opt) {

            opt = $.extend({handle:"",cursor:"move"}, opt);

            if(opt.handle === "") {
                var $el = this;
            } else {
                var $el = this.find(opt.handle);
            }

            return $el.css('cursor', opt.cursor).on("mousedown", function(e) {
                // If the clicked div is resizer, don't make it draggable.
                if(e.target.className === "resizer") {
                    return false;
                }

                var $drag = $(this).addClass('draggable');

                var z_idx = $drag.css('z-index'),
                    drg_h = $drag.outerHeight(),
                    drg_w = $drag.outerWidth(),
                    pos_y = $drag.offset().top + drg_h - e.pageY,
                    pos_x = $drag.offset().left + drg_w - e.pageX;
                $drag.css('z-index', 1000);

                $(window).on("mousemove", function(e) {
                    // Prevent going out of screen horizontally.
                    var left = e.pageX + pos_x - drg_w;
                    if (left < 5) {
                        left = 5;
                    } else if (left > $(window).width() - drg_w - 5) {
                        left = $(window).width() - drg_w - 5;
                    }

                    // Prevent going out of screen vertically.
                    var top = e.pageY + pos_y - drg_h;
                    if (top < $(document).scrollTop() + 55) {
                        top = $(document).scrollTop() + 55;
                    } else if (top > $(document).scrollTop() + $(window).height() - drg_h - 5) {
                        top = $(document).scrollTop() + $(window).height() - drg_h - 5;
                    }

                    $('.draggable').offset({
                        top: top,
                        left: left
                    }).on("mouseup", function() {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                    });
                }).on("mouseup", function() {
                    $(window).unbind('mousemove');
                    $(this).removeClass('draggable');
                });

                e.preventDefault(); // disable selection
            });
        }
    })(jQuery);

    // Keep track of the position of view and show small screen when original video div is out of view
    $(window).scroll(function() {
        if (floated == false && $('.ended-mode').length) {
            // If the video has ended and there is no floating screen, do nothing
            return false;
        } else if (floated == false && $(document).scrollTop() > $('.html5-video-container').offset().top + $('.html5-video-container').height()) {
            // 1. Create the mini screen div to hold the video
            $miniScreen = $('<div id="miniyoutube"></div');
            // Put the screen back to its last position, if defined.
            // Else default to top right.
            var miniScreenTop = 55;
            if (miniScreenLastTop)
                miniScreenTop = miniScreenLastTop;

            var miniScreenLeft = $(window).width() - 380;
            if (miniScreenLastLeft)
                miniScreenLeft = miniScreenLastLeft;
            $miniScreen.css('top', miniScreenTop);
            $miniScreen.css('left', miniScreenLeft);

            if (miniScreenLastHeight) {
                $miniScreen.height(miniScreenLastHeight);
            }
            if (miniScreenLastWidth) {
                $miniScreen.width(miniScreenLastWidth);
            }

            // 2. Grab the video element
            $video = $('.video-stream');
            $video.addClass('mnyt-video');

            // 3. Store the status of the video
            var videoPaused = $video.get(0).paused;

            // 4. Store the current width and height to restore later
            originalWidth = $video.width();
            originalHeight = $video.height();

            // 5. Wrap the video into the small element div
            $video.wrap($miniScreen);

            // 6. Modify clicking to differentiate long vs short clicks.
            // Long click -> dragging. Short click -> pause/play
            $('#miniyoutube').on('mousedown', function(e) {
                start = new Date().getTime();
            });
            $('#miniyoutube').on('mouseleave', function(e) {
                start = 0;
            });
            $('#miniyoutube').on('mouseup', function(e) {
                // If it's a short click, toggle the video status.
                if (resizing == true) {
                    stopDrag(e);
                    return false;
                }

                if (new Date().getTime() < (start + longpress)) {
                   toggleVideo();
                }
                return false;
            });
            $('#miniyoutube').click(function() {
                return false;
            });
            // Disable double click to full screen.
            $('#miniyoutube').dblclick(function() {
                return false;
            });

            // 7. If the video was playing before, make sure it's not paused
            if (!videoPaused) {
                $video.get(0).play();
            }

            // 8. Set the width and height of the video to fit the div
            $video.css('width', '100%');
            $video.css('height', '100%');

            // 9. Activate the draggable feature of the small screen
            $('#miniyoutube').drags();

            // 10. Set flag to true
            floated = true;

            // Add resizers to the right corners of the div
            $('#miniyoutube').append('<div>\
                                            <div class="resizer" id="mnyt-br"></div>\
                                            <img class="resize-icon" src="https://raw.githubusercontent.com/jianweichuah/miniyoutube/master/brCorner.png" />\
                                            <div class="mnyt-progress-wrap mnyt-progress">\
                                                <div class="mnyt-progress-bar mnyt-progress"></div>\
                                            </div>\
                                      </div>');

            // Add listener for the resizers
            $('.resizer').bind('mousedown.resizer', initDrag);
            $('.resize-icon').bind('mousedown.resizer', initDrag);

        } else if (floated == true && $(document).scrollTop() <= $('.html5-video-container').offset().top + $('.html5-video-container').height()) {
            // Put back the screen when the user scrolls up to the original player
            // 1. Grab the video element
            $video = $('.video-stream');

            // 2. Store the status of the video 
            var videoPaused = $video.get(0).paused;

            // 3. Save the current top and left of the mini screen.
            miniScreenLastTop = $('#miniyoutube').css('top');
            miniScreenLastLeft = $('#miniyoutube').css('left');
            miniScreenLastHeight = $('#miniyoutube').height();
            miniScreenLastWidth = $('#miniyoutube').width();

            // 4. Restore the width and heigh of the video
            $video.css('width', originalWidth);
            $video.css('height', originalHeight);

            // Remove the resizers
            $video.next().remove();

            // 5. Take away the parent.
            $video.removeClass('mnyt-video');
            $video.unwrap();

            // 6. Make the video status consistent
            if (!videoPaused) {
                $video.get(0).play();
            }

            // 7. Set flag to false
            floated = false;
        }
    });

    function updateTime() {
        // If video is not floated, do nothing.
        if (floated == false) {
            return false;
        }
        // Get the video player and calculate the progress
        $video = $('.video-stream').get(0);

        // If the video has ended and the screen is still around, clear it.
        if (floated == true && $video.currentTime == $video.duration) {
            // 1. Grab the video element
            $miniScreen = $('.video-stream');

            // 2. Restore the width and heigh of the video
            $miniScreen.css('width', originalWidth);
            $miniScreen.css('height', originalHeight);

            // Remove the resizers
            $('.resizer').unbind('mousedown');
            $miniScreen.next().remove();

            // 3. Take away the parent.
            $miniScreen.removeClass('mnyt-video');
            $miniScreen.unwrap();

            // 4. Set flag to false
            floated = false;
            return false;
        }

        var percent = $video.currentTime/$video.duration;
        var progressBarWidth = $('#miniyoutube').width();
        var progressTotal = percent * progressBarWidth;

        $('.mnyt-progress-bar').stop().animate({
            left: progressTotal
        });
    }

    function initDrag(e) {
        resizing = true;
        // Store the initial values to calculate new size later
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartWidth = $('#miniyoutube').width();
        dragStartHeight = $('#miniyoutube').height();
        dragRatio = dragStartHeight/dragStartWidth;
        // Add event listeners to perform resize
        $(window).mousemove(doDrag);
        $(window).mouseup(stopDrag);
        e.preventDefault();

        return false;
    }

    function doDrag(e) {
        // if not resizing, do nothing
        if (resizing == false) {
            return false;
        }

        var newWidth = dragStartWidth + e.clientX - dragStartX;
        // Make sure the new width does not exceed the max width
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
        }
        if (newWidth < minWidth) {
            newWidth = minWidth;
        }

        var newHeight = Math.round(newWidth * dragRatio);
        $('#miniyoutube').width(newWidth);
        $('#miniyoutube').height(newHeight);
        e.preventDefault();

        return false;
    }

    function stopDrag(e) {
        // Set the flag to false
        resizing = false;
        // Remove the listensers
        $(window).unbind('mousemove');
        return false;
    }

    function toggleVideo() {
        $vid = $('.video-stream').get(0);
        if ($vid.paused)
            $vid.play();
        else
            $vid.pause();
    }
});